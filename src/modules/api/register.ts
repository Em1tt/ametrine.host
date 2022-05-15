/**
 * API for creating an account on Amethyst.host
 */
import express                 from 'express';
import { auth }                from './auth';
import fetch                   from 'node-fetch';
import { Redis }               from "../../types/redis"
let client: Redis;

export const prop = {
    name: "register",
    desc: "Creates an account (Only on Website)",
    rateLimit: {
        max: 3,
        time: 2 * (60 * 1000) // 2 Minutes
    },
    setClient: function(newClient: Redis): void { client = newClient; },
    run: async (req: express.Request, res: express.Response): Promise<express.Response | unknown> => {
        res.set("Allow", "POST"); // To give the method of whats allowed
        if (req.method != "POST") return res.sendStatus(405) // If the request isn't POST then respond with Method not Allowed.
        const { name, email, password, passwordConfirm } = req.body;
        if ([name, email, password].includes(undefined)) return res.status(406)
                                                                   .send("Please enter in a Name, Email, and Password.");
        function recaptcha() {
            const key = process.env.RECAPTCHA_SECRET;
            return new Promise((resolve, reject) => { // Promises are great.
                const response = req.body["g-recaptcha-response"];
                fetch(`https://hcaptcha.com/siteverify?secret=${key}&response=${response}`, {
                    method: 'POST',
                }).then(resp => resp.json())
                  .then(json => resolve(json))
                  .catch(e => reject(e));
            })
        }
        /*
        <script src="https://www.recaptcha.net/recaptcha/api.js" async defer></script>
        <div class="g-recaptcha brochure__form__captcha"
            data-sitekey="PUBLIC_KEY">
        </div>
        */
        const recaptcha_response = await recaptcha();
        if (!recaptcha_response || (recaptcha_response && !recaptcha_response["success"])) return res.status(403).send("Recaptcha failed!");
        const userExists = await client.db.hexists('users.email', email); // Checks if the user exists.
        if (userExists) return res.status(409)
                                  .send("E-Mail already registered."); // User exists

        if (password != passwordConfirm) return res.status(406).send("Both password and confirm password much match!");
        const passResult = await auth.setPassword(password);
        if (passResult.result && passResult.result == 406) return res.status(406)
                                                                     .send("Password must not be less than 6 characters.");
        const registeredAt = Date.now()
        return client.incr("user_id", async function(err, userID) {
            if (err) {
                console.error(err);
                return res.status(500).send("Error occured while incrementing user ID. Please report this.")
            }
            // Encrypt data such as email, name, etc in AES256 later.
            await client.db.hset([`user:${userID}`, "user_id", userID, "name", name, "email", email, "password", passResult.password, "salt", passResult.salt, "registered", registeredAt, "permission_id", 0, "version", auth.version, "2fa", 0, "otp_secret", '-1', "backup_codes", '[]', "state", 0]);
            // Version determines the version of rows. If a version is different, it'll update the row.
            
            const account = await client.db.hgetall(`user:${userID}`)
            if (!account) return res.status(500).send("Error occured while trying to find user account. Please report this.");
            await client.db.hset([`users.email`, email, userID]);
            const loginToken = await auth.login(req, res, account, false, false);
            if (loginToken == 403) return res.sendStatus(403);
            auth.setCookie(res, "jwt", loginToken["refreshToken"], loginToken["expiresIn"]);
            auth.setCookie(res, "access_token", loginToken["accessToken"], loginToken["expiresIn"]);
            res.json(loginToken)
        })
    }
}

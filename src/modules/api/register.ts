/**
 * API for creating an account on Amethyst.host
 */
import express                 from 'express';
import { sql }                 from '../sql';
import { auth }                from './auth';
import fetch                   from 'node-fetch';

let client;

export const prop = {
    name: "register",
    desc: "Creates an account (Only on Website)",
    rateLimit: {
        max: 3,
        time: 2 * (60 * 1000) // 2 Minutes
    },
    setClient: function(newClient) { client = newClient; },
    run: async (req: express.Request, res: express.Response) => {
        res.set("Allow", "POST"); // To give the method of whats allowed
        if (req.method != "POST") return res.sendStatus(405) // If the request isn't POST then respond with Method not Allowed.
        const { name, email, password, passwordConfirm } = req.body;
        if ([name, email, password].includes(undefined)) return res.status(406)
                                                                   .send("Please enter in a Name, Email, and Password.");
        

        function recaptcha() {
            const key = process.env.RECAPTCHA_SECRET;
            return new Promise((resolve, reject) => { // Promises are great.
                const response = req.body["g-recaptcha-response"];
                fetch(`https://www.google.com/recaptcha/api/siteverify?secret=${key}&response=${response}`, {
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
        const userExists = await sql.db.prepare("SELECT count(*) FROM users WHERE email = ?")
                                       .pluck().get(email); // Checks if the user exists.
        if (userExists) return res.status(409)
                                  .send("409 Existing Email Exists (Conflict)."); // User exists

        if (password != passwordConfirm) return res.status(406).send("Both password and confirm password much match!");
        const passResult = await auth.setPassword(password);
        if (passResult.result && passResult.result == 406) return res.status(406)
                                                                     .send("Password must not be less than 6 characters.");
        const registeredAt = Date.now()
        // Encrypt data such as email, name, etc in AES256 later.
        await sql.db.prepare('INSERT INTO users (registered, name, email, password, salt) VALUES (?, ?, ?, ?, ?)').run(registeredAt, name, email, passResult.password, passResult.salt)
        const account = await sql.db.prepare('SELECT * FROM users WHERE email = ? AND name = ? AND registered = ?').get(email, name, registeredAt);
        const loginToken = await auth.login(req, res, account, false);
        if (loginToken == 403) return res.sendStatus(403);
        res.json(loginToken)
    }
}

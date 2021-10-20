/**
 * API for Users on Ametrine.host
 */
 import express                 from 'express';
 import { auth }                from './auth';
 
 function allowedMethod(req: express.Request, res: express.Response, type: Array<string>): boolean { // I should probably turn this into a global function instead of copying & pasting all over the place.
    res.set("Allow", type.join(", "));
    if (!type.includes(req.method)) {
        res.sendStatus(405);
        return false;
    }
    return true;
}
let client: any;
export const prop = {
    name: "user",
    desc: "API for users.",
    rateLimit: {
        max: 2,
        time: 10 * 1000
    },
    setClient: function(newClient: unknown): void { client = newClient; },
    run: async (req: express.Request, res: express.Response): Promise<express.Response> => {
        // Copy & Paste from tickets.ts hA
        const allowedMethods = ["GET", "POST", "PATCH", "PUT", "DELETE"];
        const params = req.params[0].split("/").slice(1); // Probably a better way to do this in website.ts via doing /api/:method/:optionalparam*? but it doesnt work for me.
        res.set("Allow", allowedMethods.join(", ")); // To give the method of whats allowed
        if (!allowedMethods.includes(req.method)) return res.sendStatus(405) // If the request isn't included from allowed methods, then respond with Method not Allowed.
        let userData = await auth.verifyToken(req, res, false, "access");
        if (userData == 101) {
            const newAccessToken = await auth.regenAccessToken(req, res);
            if (typeof newAccessToken != "string") return false;
            userData = await auth.verifyToken(req, res, false, "both")
        }
        if (typeof userData != "object") return res.sendStatus(userData);
        if (!userData["accessToken"]) return res.sendStatus(403); // Forbidden due to having the incorrect response. Probably will never happen unless the users JWT is REALLY weird
        let paramName = params[0]
        if (!paramName) {
            paramName = ""
        }
        switch (paramName) {
            case "logout": { // Logs out a user.
                if (allowedMethod(req, res, ["POST"])) {
                    // Not sure why I tried using Access Tokens to log out, or even sure if it worked.
                    const { refreshToken } = await auth.verifyToken(req, res, false, "refresh");
                    if (!refreshToken) return res.sendStatus(403);
                    const sessionID = await client.db.hget("sessions.jwtid", `${refreshToken}:${userData["user_id"]}`);
                    if (!sessionID) return res.sendStatus(403);
                    return client.del(`session:${sessionID}`, function (err) {
                        if (err) {
                            console.error(err);
                            return res.status(500).send("Error occured while deleting the session. Please report this.")
                        }
                        return client.hdel(`sessions.jwtid`, `${refreshToken}:${userData["user_id"]}`, function (err2) {
                            if (err2) {
                                console.error(err2);
                                return res.status(500).send("Error occured while deleting the session. Please report this.")
                            }
                            res.clearCookie('jwt'); // Use this next time for clearing cookies, as using document.cookie via JS wont work due to the cookie being httpOnly.
                            res.clearCookie('access_token')
                            return res.sendStatus(200); // OK
                        })
                    })
                    
                }
                break;
            }
            case "2fa": { // Enables 2FA (currently not made yet)
                break;
            }
            case "": {
                if (allowedMethod(req, res, ["DELETE", "PUT"])) {
                    switch (req.method) {
                        case "PUT": { // Updating user data, such as first name, email, etc
                            let user = await client.db.hmget(`user:${userData["user_id"]}`, ["password", "salt"])
                            if (!user) return res.sendStatus(403);
                            user = { password: user[0], salt: user[1] };
                            const { name, email, password } = req.body;
                            if (!name && !email && !password) return res.sendStatus(406) // If nothing is provided, or invalid body was provided, bye.
                            let updated = false;
                            const verifyHash = await auth.verifyPassword(password, user);
                            if (!verifyHash) return res.status(403).send("Incorrect Password.");
                            if (name && name.length && name != userData["name"]) {
                                const nameRes = await client.db.hset([`user:${userData["user_id"]}`, "name", name])
                                if (nameRes != 0) return res.status(500).send("Error occured while changing name. Please report this.")
                                updated = true;
                            }
                            if (email && email.length && email != userData["email"]) {
                                const emailUsed = await client.db.hexists('users.email', email);
                                if (emailUsed) return res.status(403).send("Email is already being used.");
                                const emailRes = await client.db.hset([`user:${userData["user_id"]}`, "email", email])
                                if (emailRes != 0) return res.status(500).send("Error occured while changing email. Please report this.")
                                await client.hdel('users.email', userData["email"], function(err, emailRes2) {
                                    if (!emailRes2) return console.error(err);
                                })
                                await client.db.hset([`users.email`, email, 1])
                                updated = true;
                            }
                            // Commented below due to password changing not implemented in front end, will need another field (confirmPassword)
                            /*if (password && password.length) { // Would really want to implement a ratelimit soon, since this could easily stress our servers.
                                const user = await sql.db.prepare('SELECT password, salt FROM users WHERE user_id = ?').get(userData["user_id"]);
                                if (!user) return res.sendStatus(404);
                                const passResult = await auth.setPassword(password);
                                if (passResult.result && passResult.result == 406) return res.status(406)
                                                                                             .send("Password must not be less than 6 characters.");
                                const verifyHash = await auth.verifyPassword(password, user);
                                if (verifyHash) return res.status(403).send("You can't change it to the same password.");
                                
                                await sql.db.prepare('UPDATE users SET password = ?, salt = ? WHERE user_id = ?').run(passResult.password, passResult.salt, userData["user_id"]);
                                updated = true;
                            }*/
                            if (!updated) return res.sendStatus(202);
                            await auth.regenAccessToken(req, res);
                            return res.sendStatus(200);
                        }
                        case "DELETE": // Deletes the account.

                            break;
                    }
                }
                break;
            }
            default:
                return res.sendStatus(404)
        }
        
    }
}
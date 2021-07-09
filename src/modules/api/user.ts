/**
 * API for Users on Ametrine.host
 */
 import express                 from 'express';
 import { sql }                 from '../sql';
 import { auth }                from './auth';
 
 function allowedMethod(req: express.Request, res: express.Response, type: Array<string>): boolean { // I should probably turn this into a global function instead of copying & pasting all over the place.
    res.set("Allow", type.join(", "));
    if (!type.includes(req.method)) {
        res.sendStatus(405);
        return false;
    }
    return true;
}
export const prop = {
    name: "user",
    desc: "API for users.",
    run: async (req: express.Request, res: express.Response) => {
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
                    sql.db.prepare('DELETE FROM sessions WHERE user_id = ? AND jwt = ?')
                          .run(userData["user_id"], userData, userData["accessToken"]);
                    res.clearCookie('jwt'); // Use this next time for clearing cookies, as using document.cookie via JS wont work due to the cookie being httpOnly.
                    res.clearCookie('access_token')
                    return res.sendStatus(200); // OK
                }
                break;
            }
            case "2fa": { // Enables 2FA (currently not made yet)
                break;
            }
            case "": {
                if (allowedMethod(req, res, ["DELETE", "PUT"])) {
                    switch (req.method) {
                        case "PUT": { // Updating user data, such as first name, email, password, etc
                            const { name, email, password } = req.body;
                            if (!name && !email && !password) return res.sendStatus(406) // If nothing is provided, or invalid body was provided, bye.
                            let updated = false;
                            if (name && name.length && name != userData["name"]) {
                                await sql.db.prepare('UPDATE users SET name = ? WHERE user_id = ?').run(name, userData["user_id"]);
                                updated = true;
                            }
                            if (email && email.length && email != userData["email"]) {
                                await sql.db.prepare('UPDATE users SET email = ? WHERE user_id = ?').run(email, userData["user_id"]);
                                updated = true;
                            }
                            if (password && password.length) { // Would really want to implement a ratelimit soon, since this could easily stress our servers.
                                const user = await sql.db.prepare('SELECT password, salt FROM users WHERE user_id = ?').get(userData["user_id"]);
                                if (!user) return res.sendStatus(404);
                                const passResult = await auth.setPassword(password);
                                if (passResult.result && passResult.result == 406) return res.status(406)
                                                                                             .send("Password must not be less than 6 characters.");
                                const verifyHash = await auth.verifyPassword(password, user);
                                if (verifyHash) return res.status(403).send("You can't change it to the same password.");
                                
                                await sql.db.prepare('UPDATE users SET password = ?, salt = ? WHERE user_id = ?').run(passResult.password, passResult.salt, userData["user_id"]);
                                updated = true;
                            }
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
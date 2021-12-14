/**
 * API for Users on Ametrine.host
 */
import express                 from 'express';
import { auth }                from './auth';
import { otp }                 from '../otp';
import { utils }               from '../utils';
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
        //let userData = await auth.verifyToken(req, res, false, "access");
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
                if (utils.allowedMethod(req, res, ["POST"])) {
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
            case "2fa": { // Enables 2FA
                if (utils.allowedMethod(req, res, ["DELETE", "POST"])) {
                    const OTPEnabled = await client.db.hget(`user:${userData["user_id"]}`, "2fa");
                    switch (req.method) {
                        case "POST": {
                            if (OTPEnabled == 1) return res.status(406).send("2FA is already enabled!")
                            let { code } = req.body;
                            if (!code) {
                                return otp.generate2FA(userData["email"], "ametrine.host").then(async genOTP => {
                                    if (!genOTP || typeof genOTP != 'object') return res.status(500).send("An error occured while generating 2FA. Please report this.");
                                    const secretRes = await client.db.hset([`user:${userData["user_id"]}`, "otp_secret", genOTP.secret, "backup_codes", JSON.stringify(genOTP.backupCodes)])
                                    if (secretRes != 0) return res.status(500).send("Error occured while changing the OTP Secret and/or Backup Codes. Please report this.");
                                    return res.status(200).json(genOTP);
                                }).catch(err => {
                                    console.error(err);
                                    return res.status(500).send("An error occured while generating 2FA. Please report this.");
                                });
                            } else {
                                try {
                                    if (isNaN(parseInt(code))) return res.status(406).send("Please type in a valid code.");
                                    const secret = await client.db.hget(`user:${userData["user_id"]}`, "otp_secret");
                                    const backupCodes = JSON.parse(await client.db.hget(`user:${userData["user_id"]}`, "backup_codes"));
                                    
                                    if (!secret || secret == "-1") return res.status(404).send("Unknown Secret.");
                                    code = parseInt(code);
                                    const verifyCode = otp.verify2FA(code, secret);
                                    if (!verifyCode) return res.status(403).send("Invalid code.");
                                    const OTPres = await client.db.hset([`user:${userData["user_id"]}`, "2fa", 1]);
                                    if (OTPres != 0) return res.status(500).send("Error occured while changing the 2FA status. Please report this.");
                                    return res.status(200).json({backupCodes});
                                } catch (e) {
                                    console.error(e);
                                    res.sendStatus(500);
                                }
                                break;
                            }
                        }
                        case "DELETE": {
                            if (OTPEnabled != 1) return res.status(403).send("2FA isn't enabled.");
                            try {
                                let { code } = req.body;
                                if (isNaN(parseInt(code))) return res.status(406).send("Please type in a valid code.");
                                const secret = await client.db.hget(`user:${userData["user_id"]}`, "otp_secret");
                                if (!secret || secret == "-1") return res.status(404).send("Unknown Secret.");
                                code = parseInt(code);
                                const verifyCode = otp.verify2FA(code, secret);
                                if (!verifyCode) return res.status(403).send("Invalid code.");
                                const OTPres = await client.db.hset([`user:${userData["user_id"]}`, "2fa", 0, "otp_secret", -1, "backup_codes", '[]']);
                                if (OTPres != 0) return res.status(500).send("Error occured while changing the 2FA status. Please report this.");
                                return res.sendStatus(204);
                            } catch (e) {
                                console.error(e);
                                res.sendStatus(500);
                            }
                        }
                    }
                }
                break; // TS errors without this.
            }
            case "": {
                if (utils.allowedMethod(req, res, ["DELETE", "PUT"])) {
                    switch (req.method) {
                        case "PUT": { // Updating user data, such as first name, email, etc
                            let user = await client.db.hmget(`user:${userData["user_id"]}`, ["password", "salt"])
                            if (!user) return res.status(404).send("Cannot find user.");
                            user = { password: user[0], salt: user[1] };
                            const { name, email, password, passwordNew, passwordConfirm } = req.body;

                            if (name && email) { // Updating user info
                                if (!name && !email && !password) return res.status(406).send("Please insert either a name, email. And also insert a password.") // If nothing is provided, or invalid body was provided, bye.
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
                                if (!updated) return res.sendStatus(202);
                                await auth.regenAccessToken(req, res);
                                return res.sendStatus(200);
                            } else { // Updating password
                                const { refreshToken } = await auth.verifyToken(req, res, false, "refresh");
                                if (!refreshToken) return res.sendStatus(403);
                                const sessionID = await client.db.hget("sessions.jwtid", `${refreshToken}:${userData["user_id"]}`);
                                if (!sessionID) return res.sendStatus(403);

                                if (!password || !passwordNew || !passwordConfirm) return res.status(406).send("Please insert the passwords in the password fields!")
                                const verifyHash = await auth.verifyPassword(password, user);
                                if (!verifyHash) return res.status(403).send("Incorrect Password.");
                                if (passwordNew != passwordConfirm) return res.status(406).send("The new passwords don't match.") // Could do this instead in client side.
                                const passResult = await auth.setPassword(passwordNew);
                                if (passResult.result && passResult.result == 406) return res.status(406)
                                                                                             .send("New password must not be less than 6 characters.");
                                const verifyNewHash = await auth.verifyPassword(passwordNew, user);
                                if (verifyNewHash) return res.status(403).send("You can't change your password to the current password.");
                                const passwordRes = await client.db.hset([`user:${userData["user_id"]}`, "password", passResult.password, "salt", passResult.salt])
                                if (passwordRes != 0) return res.status(500).send("Error occured while changing the password. Please report this.");
                                const getAllSessions: Record<string, unknown> = await client.db.hgetall(`sessions.jwtid`); // May find another solution to this, as this could cost performance.
                                if (!getAllSessions) return res.status(500).send("Sessions not found.");
                                const userSessions = Object.keys(getAllSessions).filter(session => session.split(":")[1] == userData["user_id"] && session != `${refreshToken}:${userData["user_id"]}`); // Get all sessions besides user
                                if (!userSessions.length) return res.sendStatus(200) // No other sessions found besides the users.
                                let errorMsg = null;
                                userSessions.map(session => {
                                    client.del(`session:${getAllSessions[session]}`, function(err) {
                                        if (err) {
                                            console.error(err);
                                            errorMsg = "Error occurred while deleting the sessions. Please report this.";
                                            return;
                                        }
                                        return client.hdel(`sessions.jwtid`, `${session}:${userData["user_id"]}`, function (err2) {
                                            if (err2) {
                                                console.error(err2);
                                                errorMsg = "Error occured while deleting the session. Please report this."
                                                return;
                                            }
                                        })
                                    })
                                })
                                if (errorMsg != null) return res.status(500).send(errorMsg);
                                return res.sendStatus(200); // OK
                            }
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

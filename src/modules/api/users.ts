/**
* API for Users on Ametrine.host
*/
import express                 from 'express';
import { auth }                from './auth';
import { otp }                 from '../otp';
import { utils }               from '../utils';
import { permissions }         from '../permissions'
import { UserData }            from "../../types/billing/user";
import { Redis }               from "../../types/redis";
let client: Redis;

function paginate(array: Array<unknown>, page_size: number, page_number: number): Array<unknown> { // https://stackoverflow.com/a/42761393
    // human-readable page numbers usually start with 1, so we reduce 1 in the first argument
    return array.slice((page_number - 1) * page_size, page_number * page_size);
}

export const prop = {
    name: "users",
    desc: "API for users (Staff Only).",
    rateLimit: {
        max: 10,
        time: 10 * 1000
    },
    setClient: function(newClient: Redis): void { client = newClient; },
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
        if (!permissions.hasPermission(userData['permission_id'], `/users`)) return res.sendStatus(403);
        let paramName = params[0]
        if (!paramName) {
            paramName = ""
        }
        if (!isNaN(parseInt(paramName))) {
            paramName = ":userid"
        }

        function showUserData(userObj: UserData) {
            return {
                "user_id": parseInt(userObj.user_id.toString()),
                "name": userObj.name,
                "email": userObj.email,
                "permission_id": userObj.permission_id,
                "2fa": (userObj["2fa"] == 1),
                "state": (userObj.state) ? parseInt(userObj.state.toString()) : 0
            };
        }
        
        async function deleteUser(userObj: UserData) {
            if (userObj.state == 2) return res.status(406).send("The account is already in the process of being deleted!")
            if ([3,4].includes(userObj.state)) return res.status(406).send("The account is currently either disabled or terminated.")
            // Deleting all sessions
            let getAllSessions = await client.db.hgetall(`sessions.jwtid`); // May find another solution to this, as this could cost performance.
            const userSessions = Object.keys(getAllSessions).filter(session => session.split(":")[1] == userObj.user_id); // Get all sessions.
            if (!userSessions.length) getAllSessions = []; // No other sessions found.
            auth.logoutAll(userObj.user_id, userSessions, getAllSessions).then(() => {
                if (req.body.force != undefined) {
                    return client.del(`user:${userObj.user_id}`, function (err) {
                        if (err) {
                            console.error(err);
                            return res.status(500).send("Error occured while deleting the user. Please report this.")
                        }
                        client.hdel("users.email", userObj.email);
                        return res.sendStatus(204);
                    })
                } else {
                    auth.startDeletion(userObj.user_id).then(result => {
                        if (result) {
                            return res.sendStatus(204);
                        }
                    }).catch(err => {
                        console.error(err)
                        return res.status(500).send(err);
                    })
                }
                // May have to setup a cron job later for purging unused emails
            }).catch(err => {
                console.error(err);
                return res.status(500).send(err);
            })
            return true;
        }
        switch (paramName) {
            case ":userid": { // Single User
                if (utils.allowedMethod(req, res, ["GET", "PUT", "PATCH", "DELETE"])) {
                    const userID = parseInt(params[0])
                    if (userID < 0) return res.sendStatus(406);
                    const getUser: UserData = await client.db.hgetall(`user:${userID}`);
                    if (!getUser) return res.status(404).send("User not found."); // If no users are found.
                    if (params[1]) {
                        switch (params[1]) {
                            case "services": { // For showing the list of services they have (VPS')
                                break;
                            }
                            case "terminate": { // For starting the deletion period and notifying the user that their account was deleted (Not sure if this will be added)
                                break;
                            }
                            case "canceldelete": { // For cancelling the deletion period
                                if (utils.allowedMethod(req, res, ["POST"])) {
                                    //if ([3,4].includes(getUser.state)) return res.status(406).send("The account is currently either disabled or terminated.") Useless since one line under IF statement exists
                                    if (getUser.state != 2) return res.status(406).send("The account is not in the process of being deleted!")
                                    auth.cancelDeletion(getUser.user_id).then(resp => {
                                        if (resp) {
                                            return res.sendStatus(204);
                                        }
                                    }).catch(err => {
                                        console.error(err);
                                        return res.status(500).send(err);
                                    })
                                }
                                break;
                            }
                        }
                    } else {
                        switch (req.method) {
                            case "GET": // gets the users data
                                return res.status(200).json(showUserData(getUser));
                            case "PUT": { // Edits user information such as their name, email, clearing sessions, or password
                                if (parseInt(getUser["permission_id"] as string) >= parseInt(userData["permission_id"])) return res.status(403).send("Due to the user having a higher or equal permission as you, you aren't able to change their details!"); // You can change this message
                                const { name, email, password, passwordConfirm } = req.body;
                                if (name && email) {
                                    let updated = false;
                                    if (name && name.length && name != getUser["name"]) {
                                        const nameRes = await client.db.hset([`user:${userID}`, "name", name]);
                                        if (nameRes != 0) return res.status(500).send("Error occured while changing the name of the user. Please report this.");
                                        updated = true;
                                    }
                                    if (email && email.length && email != getUser["email"]) {
                                        const { email } = req.body;
                                        const emailUsed = await client.db.hexists('users.email', email);
                                        if (emailUsed) return res.status(403).send("Email is already being used.");
                                        const emailRes = await client.db.hset([`user:${userID}`, "name", email]);
                                        if (emailRes != 0) return res.status(500).send("Error occured while changing email. Please report this.")
                                        client.hdel('users.email', userData["email"], async function(err, emailRes2) {
                                            if (!emailRes2 || err) return console.error(err);
                                            const emailRes3 = await client.db.hset([`users.email`, email, 1])
                                            if (emailRes3 != 0) return res.status(500).send("Error occured while changing the claimed emails. Please report this.")
                                        })
                                        updated = true;
                                    }
                                    if (!updated) return res.sendStatus(202);
                                    return res.sendStatus(204);
                                } else { // Changing password. This will also log the user out
                                    if (!password || !passwordConfirm) return res.status(406).send("Please insert the passwords in the password fields!")
                                    if (password != passwordConfirm) return res.status(406).send("The new passwords don't match.") // Could do this instead in client side.
                                    const passResult = await auth.setPassword(password);
                                    if (passResult.result && passResult.result == 406) return res.status(406)
                                                                                                 .send("New password must not be less than 6 characters.");
                                    const verifyNewHash = await auth.verifyPassword(password, getUser);
                                    if (verifyNewHash) return res.status(403).send("You can't change the password to the current password.");
                                    const passwordRes = await client.db.hset([`user:${userID}`, "password", passResult.password, "salt", passResult.salt])
                                    if (passwordRes != 0) return res.status(500).send("Error occured while changing the password. Please report this.");
                                    let getAllSessions = await client.db.hgetall(`sessions.jwtid`); // May find another solution to this, as this could cost performance.
                                    if (!getAllSessions) return res.status(500).send("Sessions not found.");
                                    const userSessions = Object.keys(getAllSessions).filter(session => session.split(":")[1] == getUser["user_id"]); // Get all sessions
                                    if (!userSessions.length) getAllSessions = []; // No other sessions found
                                    return auth.logoutAll(userID, userSessions, getAllSessions).then(() => {
                                        return res.sendStatus(204)
                                    }).catch(err => {
                                        console.error(err);
                                        return res.status(500).send(err);
                                    })
                                }

                                /*const { category } = req.body;
                                switch (category) {
                                    case "name": {
                                        const { name } = req.body;
                                        const nameRes = await client.db.hset([`user:${userID}`, "name", name]);
                                        if (nameRes != 0) return res.status(500).send("Error occured while changing the name of the user. Please report this.");
                                        return res.sendStatus(204);
                                    }
                                    case "email": {
                                        const { email } = req.body;
                                        const emailUsed = await client.db.hexists('users.email', email);
                                        if (emailUsed) return res.status(403).send("Email is already being used.");
                                        const emailRes = await client.db.hset([`user:${userID}`, "name", email]);
                                        if (emailRes != 0) return res.status(500).send("Error occured while changing email. Please report this.")
                                        return client.hdel('users.email', userData["email"], async function(err, emailRes2) {
                                            if (!emailRes2 || err) return console.error(err);
                                            const emailRes3 = await client.db.hset([`users.email`, email, 1])
                                            if (emailRes3 != 0) return res.status(500).send("Error occured while changing the claimed emails. Please report this.")
                                            return res.sendStatus(204);
                                        })
                                    }
                                    case "password": { // This will also log the user out
                                        const { password, passwordConfirm } = req.body;
                                        

                                        if (password != passwordConfirm) return res.status(406).send("The new passwords don't match.") // Could do this instead in client side.
                                        const passResult = await auth.setPassword(password);
                                        if (passResult.result && passResult.result == 406) return res.status(406)
                                                                                                     .send("New password must not be less than 6 characters.");
                                        const verifyNewHash = await auth.verifyPassword(password, getUser);
                                        if (verifyNewHash) return res.status(403).send("You can't change the password to the current password.");
                                        const passwordRes = await client.db.hset([`user:${userID}`, "password", passResult.password, "salt", passResult.salt])
                                        if (passwordRes != 0) return res.status(500).send("Error occured while changing the password. Please report this.");
                                        let getAllSessions = await client.db.hgetall(`sessions.jwtid`); // May find another solution to this, as this could cost performance.
                                        if (!getAllSessions) return res.status(500).send("Sessions not found.");
                                        const userSessions = Object.keys(getAllSessions).filter(session => session.split(":")[1] == getUser["user_id"]); // Get all sessions
                                        if (!userSessions.length) getAllSessions = []; // No other sessions found
                                        return auth.logoutAll(userID, userSessions, getAllSessions).then(() => {
                                            return res.sendStatus(204)
                                        }).catch(err => {
                                            console.error(err);
                                            return res.status(500).send(err);
                                        })
                                    }
                                   
                                    default:
                                        return res.status(406).send("Enter in a category!");
                                }*/
                            }
                            case "PATCH": { // Edits user information such as toggling 2fa, or permission id
                                if (parseInt(getUser["permission_id"] as string) >= parseInt(userData["permission_id"])) return res.status(403).send("Due to the user having a higher or equal permission as you, you aren't able to change their details!"); // You can change this message
                                const { category } = req.body;
                                switch (category) {
                                    case "2fa": {
                                        if (getUser["2fa"] != 1) return res.status(403).send("Only the user is allowed to turn on 2FA.");
                                        try {
                                            const OTPres = await client.db.hset([`user:${userID}`, "2fa", 0, "otp_secret", -1, "backup_codes", '[]']);
                                            if (OTPres != 0) return res.status(500).send("Error occured while changing the 2FA status. Please report this.");
                                            return res.sendStatus(204);
                                        } catch (e) {
                                            console.error(e);
                                            return res.sendStatus(500);
                                        }
                                    }
                                    case "permission": {
                                        if (!permissions.hasPermission(userData['permission_id'], `/users/:userid/permission`)) return res.sendStatus(403);
                                        const { id } = req.body;
                                        if (!permissions.isAdminPermission(userData['permission_id']) && parseInt(id) >= parseInt(userData["permission_id"])) return res.status(403).send("You can't set a permission higher than or equal as your own!");
                                        if (!permissions.validPermission(id)) return res.status(406).send("Invalid permission ID.");
                                        const permRes = await client.db.hset([`user:${userID}`, "permission_id", id]);
                                        if (permRes != 0) return res.status(500).send("Error occured while changing the permission ID. Please report this.");
                                        return res.sendStatus(204);
                                    }
                                    case "sessions": {
                                        let getAllSessions = await client.db.hgetall(`sessions.jwtid`); // May find another solution to this, as this could cost performance.
                                        if (!getAllSessions) return res.status(500).send("Sessions not found.");
                                        const userSessions = Object.keys(getAllSessions).filter(session => session.split(":")[1] == getUser["user_id"]); // Get all sessions
                                        if (!userSessions.length) getAllSessions = []; // No other sessions found
                                        return auth.logoutAll(userID, userSessions, getAllSessions).then(() => {
                                            return res.sendStatus(204);
                                        }).catch(err => {
                                            console.error(err);
                                            return res.status(500).send(err);
                                        })
                                    }
                                    default:
                                        return res.status(406).send("Enter in a category!");
                                }
                            }
                            case "DELETE": // Starts the deletion period (Used if users want to delete their accounts but dont have access to it)
                                return deleteUser(getUser);
                            default:
                                return res.status(400).send("???")
                        }
                    }

                }
                break;
            }
            case "": { // This or any other param affects all users.
                if (utils.allowedMethod(req, res, ["GET"])) {
                    switch (req.method) {
                        case "GET": { // Shows a list of users
                            let page = 1;
                            if (!isNaN(parseInt(req.query.page))) page = parseInt(req.query.page);
                            const uIDs       : Array<number> = [],
                                  permissions: Array<string> = [],
                                  emails     : Array<string> = [];
                            if (req.query.filter){
                                req.query.filter.split(",").forEach(filter => {
                                    if(!isNaN(parseInt(filter))) return uIDs.push(parseInt(filter));
                                    if(filter.split("=")[0].toLowerCase() == "perm") return permissions.push(filter.split("=")[1]);
                                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                                    if(emailRegex.test(filter.toLowerCase())) return emails.push(filter.toLowerCase());
                                });
                            }
                            return client.keys("user:*", async function (err, result) {
                                if (err) {
                                    console.error(err);
                                    return res.status(500).send("Error occured while retrieving keys for users. Please report this.")
                                }
                                if(uIDs.length) result = result.filter(u => uIDs.includes(parseInt(u.split(":")[1])));
                                if(!result.length) return res.sendStatus(404);
                                let users: Array<UserData> = await Promise.all(result.map(async userID => {
                                    const user = await client.db.hgetall(userID);
                                    return user;
                                }));
                                if(permissions.length) users = users.filter(user => permissions.includes(user.permission_id as string));
                                if(emails.length) users = users.filter(user => emails.includes(user.email.toLowerCase()));
                                if(!users.length) return res.sendStatus(404);
                                res.status(200).json(paginate(users.map(user => showUserData(user)), 10, page));
                            });
                        }
                    }
                }
                break;
            }

            default:
                return res.sendStatus(404)
        }
        
    }
}
 

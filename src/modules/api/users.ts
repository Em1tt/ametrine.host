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
        max: 5,
        time: 10 * 1000
    },
    setClient: function(newClient: Redis): void { client = newClient; },
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
            const userSessions = Object.keys(getAllSessions).filter(session => session.split(":")[1] == userObj.user_id); // Get all sessions besides user
            if (!userSessions.length) getAllSessions = []; // No other sessions found besides the users.
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
                        }
                    } else {
                        switch (req.method) {
                            case "GET": // gets the users data
                                return res.status(200).json(showUserData(getUser));
                            case "PUT": // Edits user information such as their name, email, clearing sessions, or password
                                // not finished
                                break;
                            case "PATCH": { // Edits user information such as toggling 2fa, or permission id
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
                                        if (id >= parseInt(userData["permission_id"])) return res.status(403).send("You can't set a permission higher than your own!");
                                        const validPermission = permissions.validPermission(id);
                                        if (!validPermission) return res.status(406).send("That is an invalid Permission ID!");
                                        await client.db.hset([`user:${userID}`, "permission_id", id]);
                                        return res.sendStatus(204);
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
                            return client.keys("user:*", async function (err, result) {
                                if (err) {
                                    console.error(err);
                                    return res.status(500).send("Error occured while retrieving keys for users. Please report this.")
                                }
                                const users: Array<UserData> = await Promise.all(result.map(async userID => {
                                    const user = await client.db.hgetall(userID);
                                    return user;
                                }));
                                res.status(200).json(paginate(users.map(user => showUserData(user)), 10, page));
                            })
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
 

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
                "2fa": (userObj["2fa"] == 1)
            };
        }

        switch (paramName) {
            case ":userid": {
                if (utils.allowedMethod(req, res, ["GET", "PUT", "PATCH", "DELETE"])) {
                    const userID = parseInt(params[0])
                    if (userID < 0) return res.sendStatus(406);
                    const getUser: UserData = await client.db.hgetall(`user:${userID}`);
                    if (!getUser) return res.status(404).send("User not found."); // If no users are found.
                    switch (req.method) {
                        case "GET": // gets the users data
                            return res.status(200).json(showUserData(getUser));
                        case "PUT": // Edits user information such as their name, email, clearing sessions, or password
                            // not finished
                            break;
                        case "PATCH": // Edits user information such as toggling 2fa, or permission id
                            // not finished
                            break;
                        case "DELETE": // Starts the deletion period (Used if users want to delete their accounts but dont have access to it)
                            // not finished
                            break;
                        default:
                            return res.status(400).send("???")
                    }
                }
                break;
            }
            case "": {
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
            case "services": { // For showing the list of services they have (VPS')
                break;
            }
            case "terminate": { // For starting the deletion period and notifying the user that their account was deleted (Not sure if this will be added)
                break;
            }
            default:
                return res.sendStatus(404)
        }
        
    }
}
 
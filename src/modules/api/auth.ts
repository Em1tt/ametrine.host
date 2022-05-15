/**
 * API for authenticating a user on Amethyst.host
 */
import express                      from 'express';
import jwt                          from 'jsonwebtoken';
import argon2, { argon2id }         from 'argon2';
import { randomBytes, createHash }  from 'crypto';
import ms                           from 'ms';
import { otp }                      from '../otp';
import { UserData }                 from "../../types/billing/user";
import { Redis }                    from "../../types/redis";
import axios                        from "axios";

let client: Redis;

export interface AuthLoginStruct {
    readonly email         : string;
    readonly refreshToken  : string;
    readonly accessToken   : string;
    expiresIn              : number;
}

export const auth = {
    version: 2,
    updateHashVersion: async (userID: string | number): Promise<boolean> => {
        const data = await client.db.hgetall(`user:${userID}`);
        if (!data) return false;
        if (data["version"] == auth.version) return false;
        switch (parseInt(data["version"])) {
            default:
                await client.db.hset([`user:${userID}`, "version", auth.version]);
                break;
            case 0: // OTP_Secret for 2FA, and version.
                await client.db.hset([`user:${userID}`, "version", auth.version, "2fa", 0, "otp_secret", '-1', "backup_codes", '[]']);
                break;
            case 1:
                await client.db.hset([`user:${userID}`, "version", auth.version, "state", 0]);
                break;
        }
        console.log("[Auth] Updated User Hash Version from " + data["version"] + " to " + auth.version + ".")
        return true;
    },
    has2FA: async (userID: string | number): Promise<boolean> => {
        const data = await client.db.hget(`user:${userID}`, '2fa');
        if (!data) return false;
        return (data == 1);
    },
    // Fix for the potential security vulnerability. \/\/
    getPermissionID: async (userID: string | number, permission_id: number): Promise<number> => {
        if (permission_id == 0) return 0;
        const data = await client.db.hget(`user:${userID}`, 'permission_id');
        if (data < 2 || !data) return 0;
        return parseInt(data as string);
    },
    startDeletion: async (userID: string | number): Promise<boolean> => {
        return new Promise((resolve, reject) => {
            client.expire(`user:${userID}`, (ms("1 week") / 1000), function(err) {
                if (err) {
                    return reject("Error occurred while setting up deletion period for user. Please report this.");
                }
                client.db.hset([`user:${userID}`, "state", 2])
                resolve(true)
            })
        })
        // Later, setup a cron job that automatically purges any unused emails
        // every 1 hour or 1 day.
    },
    cancelDeletion: async (userID: string | number): Promise<boolean> => {
        return new Promise((resolve, reject) => {
            client.persist(`user:${userID}`, function(err) {
                if (err) {
                    return reject("Error occurred while setting up deletion period for user. Please report this.");
                }
                client.db.hset([`user:${userID}`, "state", 1]) // Might want to add hashes to check for verified emails, as this can cause issues with unverified emails.
                resolve(true)
            })
        })
    },
    logoutAll: (userID: string | number, sessions: Array<string>, sessionsReal?: Array<string>): Promise<boolean> => {
        return new Promise((resolve, reject) => {
            return (async function() {
                await sessions.map(async session => {
                    await auth.logout(userID, (sessionsReal != undefined) ? sessionsReal[session] : sessions[session], session)
                        .then(res => (!res) ? reject("Logout didn't return true.") : true)
                        .catch(reject)
                })
                return resolve(true);
            })()
        })
    },
    logout: (userID: string | number, sessionID: string | number, session: string): Promise<boolean> => {
        return new Promise((resolve, reject) => {
            client.del(`session:${sessionID}`, function(err) {
                if (err) return reject("Error occured while deleting the sessions. Please report this.");
                return client.hdel(`sessions.jwtid`, session, function (err2) {
                    if (err2) return reject("Error occured while deleting the session. Please report this.");
                    resolve(true)
                })
            })
        })
    },
    /**
     * Logins in the user via amethyst.host
     * @param {express.Request} req Express Request
     * @param {express.Response} res Express Response
     * @param {Object} data Data based from DB response
     * @param {Boolean} rememberMe If JWT session should be longer or not
     * @returns {Promise<any>} Email, Access Token, and Expiration.
     * 
     * @example
     * const loginToken = await <auth>.login(req, res, account, rememberMe);
     * if (loginToken == 403) return res.sendStatus(403);
     */
    login: async (req: express.Request, res: express.Response, data: UserData, rememberMe: boolean, discordLogin: boolean): Promise<number | AuthLoginStruct | Record<string, unknown>> => { // Logging in via amethyst.hosti
        const createdIn = parseInt(Date.now().toString().slice(0, -3)) // because for some reason node js decides to use an expanded timestamp
        const ipAddr = req.socket.remoteAddress;
        if(!discordLogin){
            const verifiedHash = await auth.verifyPassword(req.body.password, data)
            if (!verifiedHash) return 403;
        }
        const userData = { email: data.email, name: data.name, id: parseInt(data.user_id as string), permission_id: parseInt(data.permission_id as string) }

        // --2FA--
        const { code, type } = req.body;
        if (data["2fa"] == 1) {
            if (type == "2fa") {
                if (isNaN(parseInt(code))) {
                    res.status(406).send("Please type in a valid code.");
                    return { "2fa": true };
                }
                const secret = data["otp_secret"];
                if (!secret || secret == "-1") {
                    res.status(404).send("Unknown Secret.");
                    return { "2fa": true };
                }
                const verifyCode = otp.verify2FA(parseInt(code), secret);
                if (!verifyCode) {
                    res.status(403).send("Incorrect Code.");
                    return { "2fa": true };
                }
            } else {
                res.json({"2fa": true})
                return { "2fa": true };
            }
        }
        // --2FA--

        const refreshTokenOpts = JSON.parse(JSON.stringify(client.JWToptions.RTOptions));
        let expiresIn = parseInt(client.JWToptions.RTOptions.expiresIn.toString().slice(0, -3))
        if (rememberMe) {
            expiresIn = parseInt(client.JWToptions.RTOptionsRemember.expiresIn.toString().slice(0, -3))
        }
        //expiresIn = parseInt(expiresIn.toString().slice(0, -3))
        refreshTokenOpts.expiresIn = expiresIn;
        const refreshToken = auth.genToken({ id: userData.id }, refreshTokenOpts, "refresh");
        const accessToken = auth.genToken(userData, null, "access");
        const ip = createHash('sha256').update(ipAddr).digest('hex'); // Convert IP address to SHA256 hash
        expiresIn = expiresIn + createdIn;
        const sessionID = await client.db.incr("session_id")
        await client.db.hset([`session:${sessionID}`, "session_id", sessionID, "user_id", userData.id, "jwt", refreshToken, "createdIn", createdIn, "expiresIn", expiresIn, "ip", ip, "rememberMe", 0]);
        await client.db.hset([`sessions.jwtid`, `${refreshToken}:${userData.id}`, sessionID]);
        client.expire(`session:${sessionID}`, ((rememberMe) ? client.JWToptions.RTOptionsRemember.expiresIn : client.JWToptions.RTOptions.expiresIn) / 1000); // Should automatically delete once the date has passed.
        return { email: data.email, refreshToken, accessToken, expiresIn };
    },
    setCookie: async (res: express.Response, name: string, value: string, expiresIn: number): Promise<boolean> => {
        res.cookie(name, value, { secure: Boolean(process.env.PRODUCTION), httpOnly: true, maxAge: expiresIn, sameSite: 'strict' }); // Client Side wont access this because httpOnly.
        return true;
    },
    verifyPassword: async (password: string, data: UserData): Promise<boolean> => {
        const salt = Buffer.alloc((process.env.SALT.length * 2) - 1, process.env.SALT)
        return await argon2.verify(data["password"], password, {
            type: argon2id,
            salt: salt,
            secret: Buffer.from(data["salt"], 'hex')
        })
    },
    setPassword: async (password: string): Promise<Record<string, unknown>> => {
        const MIN_PASS_LENGTH = 6; // Minimum password length
        const SECRET_LENGTH = 32;

        if (MIN_PASS_LENGTH > password.length) return { result: 406 }
        const userSalt = randomBytes(SECRET_LENGTH);
        const salt = Buffer.alloc((process.env.SALT.length * 2) - 1, process.env.SALT)
        const hashedPass = await argon2.hash(password, {type: argon2id, salt: salt, secret: userSalt});
        return { 
            password: hashedPass,
            salt: userSalt.toString('hex')
        }
    },
    getUserData: async (req: express.Request, res: express.Response): Promise<UserData | boolean | number> => { // so ESLint can stop complaining
        if (req.cookies.jwt) {
            let verifyToken = await auth.verifyToken(req, res, false, "both")
            if (verifyToken == 101) {
                const newAccessToken = await auth.regenAccessToken(req, res);
                if (typeof newAccessToken != "string") return false;
                verifyToken = await auth.verifyToken(req, res, false, "both")
                return verifyToken;
            }
            if (verifyToken && verifyToken["accessToken"]) {
                return verifyToken;
            } else {
                return false;
            }
        } else {
            return false;
        }
    },

    // this is why typescript is better than javascript, else you would have to do a bunch of if checks, and its more readable
    /**
     * Generates a token
     * @param {Object} data Data for what should be in the JWT Token.
     * @param {Object | null} opts Options for JWT
     * @param {"refresh" | "access"} type If it is a Refresh Token or an Access Token that should be generated 
     * @returns {string}
     * 
     * @example
     * const accessToken = <auth>.genToken(userData, null, "access");
     * return accessToken;
     */
    genToken: (data: Record<string, unknown>, opts: Record<string, unknown> | null, type: "refresh" | "access"): string => { // Wont be used until I implement Refresh Tokens
        switch (type) {
            case "refresh": // Refresh Token
                return jwt.sign(data, process.env.REFRESH_TOKEN, opts);
            case "access": { // Access Token
                const opts = JSON.parse(JSON.stringify(client.JWToptions.ATOptions)); // Prevent mutation, because javascript likes to edit the object from sql.ts instead of the actual variable
                const expiryDate = parseInt(opts.expiresIn.toString().slice(0, -3));
                opts.expiresIn = expiryDate
                return jwt.sign(data, process.env.ACCESS_TOKEN, opts);
            }
        }
    },
    regenAccessToken: async (req: express.Request, res: express.Response): Promise<string | number> => {
        const verifyToken = await auth.verifyToken(req, res, false, "refresh")
        if (typeof verifyToken != "object") return verifyToken;
        const data = await client.db.hgetall(`user:${verifyToken["user_id"]}`);
        if (!data) return 404;
        const getPermissionID = await auth.getPermissionID(data.user_id, parseInt(data.permission_id))
        const userData = { email: data.email, name: data.name, id: parseInt(data.user_id), permission_id: getPermissionID }
        const accessToken = auth.genToken(userData, null, "access");
        const expiresIn = parseInt((ms("1h") + Date.now()).toString().slice(0, -3));
        auth.setCookie(res, "access_token", accessToken, expiresIn);
        req.cookies["access_token"] = accessToken;
        return accessToken;
    },
    updateAccessToken: async (req: express.Request, res: express.Response): Promise<Record<string, unknown> | boolean> => { // This was required because updating user data would require JWT access token to be updated, as it would just remain the same old information
        if (req.cookies.jwt) {
            const newAccessToken = await auth.regenAccessToken(req, res)
            if (typeof newAccessToken != "string") return false;
            const verifyToken = await auth.verifyToken(req, res, false, "access")
            if (typeof verifyToken != "object") return false
            return verifyToken;
        } else {
            return false;
        }
    },
    /**
     * Verifies if the JWT token is valid or not and gives response with User Data.
     * @param {express.Request} req Express Request
     * @param {express.Response} res Express Response
     * @param {boolean} sendResponse If it should use res.sendStatus or not.
     * @param {boolean} useAuthorization If it should use the Authorization header.
     * @returns {any} User Data or Response.
     * 
     * @example
     * const userData = await <auth>.verifyToken(req, res, false, false); // Request, Response, sendResponse (False), useAuthorization (False).
     * if (typeof userData != "object") return res.sendStatus(userData); // If its not an object. (Could be either undefined or number.)
     */
    verifyToken: async (req: express.Request, res: express.Response, sendResponse: boolean, type: "access" | "refresh" | "both"): Promise<express.Response | number | Record<string, unknown>> => { // Probably not a good idea to do this, as most people use next()
        const forbidden = () => (sendResponse) ? res.sendStatus(403) : 403;
        const currentDate = parseInt(Date.now().toString().slice(0, -3))
        if (!req.cookies) return forbidden();
        const accessToken = req.cookies["access_token"];
        const refreshToken = req.cookies["jwt"];
        if (!accessToken || !refreshToken) return forbidden()
        if (!accessToken && !refreshToken && type == "both") return forbidden()
        let user_id: string;

        let refreshTokenValid: {
            exp: number,
            id: string
        };

        //let tokenInDB: Array<number>;
        let tokenInDB: unknown;

        if (["refresh", "both"].includes(type)) {
            try {
                refreshTokenValid = jwt.verify(refreshToken, process.env.REFRESH_TOKEN, client.JWToptions.RTOptions)
                if (!refreshTokenValid) return forbidden() // Forbidden.
                const ip = createHash('sha256').update(req.ip).digest('hex');
                const sessionID = await client.db.hget("sessions.jwtid", `${refreshToken}:${refreshTokenValid.id}`);
                if (!sessionID) return forbidden()
                tokenInDB = await client.db.hgetall(`session:${sessionID}`);
                if (!tokenInDB) return forbidden();
                if (tokenInDB["ip"] != ip) return forbidden();
                if (tokenInDB["expiresIn"] < currentDate) return forbidden();
                tokenInDB = [tokenInDB["user_id"]];
                if (refreshTokenValid.exp < currentDate) return forbidden()
                user_id = refreshTokenValid.id;
            } catch (e) {
                console.error(e)
                return (sendResponse) ? res.sendStatus(401) : 401;
            }
            
        }
        let accessTokenValid: UserData
        if (["access", "both"].includes(type)) {
            try {
                accessTokenValid = jwt.verify(accessToken, process.env.ACCESS_TOKEN, client.JWToptions.ATOptions)
                if (!accessTokenValid) return (sendResponse) ? res.sendStatus(403) : 101; // Forbidden, 101 for allowing me to know if it needs to generate an Access Token.
                user_id = accessTokenValid["id"];
            } catch (e) {
                console.error(e)
                return (sendResponse) ? res.sendStatus(401) : 101;
            }
        }
        if (type == "both") {
            if (refreshTokenValid["id"] != accessTokenValid["id"]) return forbidden() // Forbidden.
        }
        const userExists = await client.db.exists(`user:${user_id}`);
        if (!userExists) return (sendResponse) ? res.sendStatus(404) : 404;
        let response = {};
        const OTPEnabled = await auth.has2FA(user_id)
        const getPermissionID = (["both","access"].includes(type)) && await auth.getPermissionID(user_id, parseInt(accessTokenValid.permission_id as string))
        switch (type) {
            case "both":
                response = { refreshToken, accessToken, user_id: tokenInDB[0], name: accessTokenValid.name, email: accessTokenValid.email, permission_id: getPermissionID, "2fa": OTPEnabled }
                break;
            case "refresh":
                response = { refreshToken, user_id: tokenInDB[0] }
                break;
            case "access":
                response = { accessToken, user_id: user_id, name: accessTokenValid.name, email: accessTokenValid.email, permission_id: getPermissionID, "2fa": OTPEnabled }
                break;
        }
        auth.updateHashVersion(user_id);
        return (sendResponse) ? res.status(200).json(response) : response;
    }
}
export const prop = {
    name: "auth",
    desc: "Authenticates a user (Logging in)",
    rateLimit: {
        max: 10,
        time: 60 * 1000
    },
    setClient: function(newClient: Redis): void { client = newClient; },
    run: async (req: express.Request, res: express.Response): Promise<express.Response | void> => {
        const allowedMethods = ["POST"];
        res.set("Allow", allowedMethods.join(", ")); // To give the method of whats allowed
        if (req.method != "POST") return res.sendStatus(405) // If the request isn't POST then respond with Method not Allowed.
        const params = req.params[0].split("/").slice(1);
        const paramName = params[0];
        switch(paramName){
            case "discord": {
                //No need for 2FA with this log-in Method as Discord handles this for us.
                const { code } = req.body;
                if(!code) return res.sendStatus(406);
                const body = new URLSearchParams({
                    client_id: process.env.OAUTH_CLIENT_ID,
                    client_secret: process.env.OAUTH_SECRET,
                    code: code,
                    grant_type: 'authorization_code',
                    redirect_uri: `http://localhost:3000/billing`,
                    scope: 'identify',
                });
                await axios.post('https://discord.com/api/oauth2/token', body).then(async response => {
                    const { access_token } = response.data;
                    const user = await axios.get('https://discord.com/api/users/@me', {
                        headers: {
                            authorization: `Bearer ${access_token}`,
                        },
                    });
                    const { id } = user.data;
                    if(!id) return res.sendStatus(403); //User failed during Discord authentication
                    return client.keys("user:*", async function (err, result) {
                        if (err) {
                            console.error(err);
                            return res.status(500).send("Error occured while retrieving keys for users. Please report this.")
                        }
                        if(!result.length) return res.sendStatus(404);
                        const users: Array<UserData> = await Promise.all(result.map(async userID => {
                            const user = await client.db.hgetall(userID);
                            return user;
                        }));
                        if(!users.length) return res.sendStatus(404);
                        //Not sure if changing UserData's type would mess something up, so I used type casting.
                        const matchedUser = users.find(user => (user as any)?.discord_user_id == id);
                        if(!matchedUser) return res.sendStatus(404);
                        switch (parseInt((matchedUser as any)["state"])) {
                            case 0: // Still unverified, not sure if you want it to check if the user verified their email or not and prevent logging in.
                                break;
                            case 2: // Process of being deleted
                                return res.status(403).send("The account you're logging into is currently in the process of deletion. Please contact [support] if you wish to stop this process.");
                            case 3: // Disabled
                                return res.status(403).send("This account is disabled. Please contact [support] if you wish to enable your account.");
                            case 4: // Terminated
                                return res.status(403).send("This account is terminated. Please read your email for more information.")
                        }
                        if (req.cookies.jwt) {
                            //return res.status(403).send("Already authenticated.")
                            await res.clearCookie('jwt');
                            await res.clearCookie('access_token')
                        }
                        const loginToken = await auth.login(req, res, matchedUser, true, true);
                        if (loginToken == 403) return res.status(403).send("Email or password incorrect");
                        auth.setCookie(res, "jwt", loginToken["refreshToken"], loginToken["expiresIn"]);
                        auth.setCookie(res, "access_token", loginToken["accessToken"], loginToken["expiresIn"]);
                        return res.json(loginToken);
                    });
                });
            } break;
            case "": {
                const { email, password, rememberMe } = req.body;
                if ([email, password].includes(undefined)) return res.status(406)
                                                                     .send("Please enter in an Email, and Password.");
                const userID = await client.db.hget('users.email', email); // Checks if the user exists.
                if (!userID) return res.status(404).send("Couldn't find email.");
                const account = await client.db.hgetall(`user:${userID}`);
                if (!account) return res.status(404).send("User doesn't exist."); // User doesn't exist.
        
                // [support] being replaced with <a href... for the front end
                switch (parseInt(account["state"])) {
                    case 0: // Still unverified, not sure if you want it to check if the user verified their email or not and prevent logging in.
                        break;
                    case 2: // Process of being deleted
                        return res.status(403).send("The account you're logging into is currently in the process of deletion. Please contact [support] if you wish to stop this process.");
                    case 3: // Disabled
                        return res.status(403).send("This account is disabled. Please contact [support] if you wish to enable your account.");
                    case 4: // Terminated
                        return res.status(403).send("This account is terminated. Please read your email for more information.")
                }
                if (req.cookies.jwt) {
                    //return res.status(403).send("Already authenticated.")
                    await res.clearCookie('jwt');
                    await res.clearCookie('access_token')
                }
                const loginToken = await auth.login(req, res, account, rememberMe, false);
                if (loginToken == 403) return res.status(403).send("Email or password incorrect");
                if (loginToken["2fa"]) return;
                auth.setCookie(res, "jwt", loginToken["refreshToken"], loginToken["expiresIn"]);
                auth.setCookie(res, "access_token", loginToken["accessToken"], loginToken["expiresIn"]);
                return res.json(loginToken);
            }
        }
    }
}

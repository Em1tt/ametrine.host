/**
 * API for authenticating a user on Amethyst.host
 */
import express                      from 'express';
import jwt                          from 'jsonwebtoken';
import argon2, { argon2id }         from 'argon2';
import { randomBytes, createHash }  from 'crypto';
import ms                           from 'ms';

let client: any;

export const auth = {
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
    login: async (req: express.Request, res: express.Response, data: any, rememberMe: boolean): Promise<any> => { // Logging in via amethyst.hosti
        const createdIn = parseInt(Date.now().toString().slice(0, -3)) // because for some reason node js decides to use an expanded timestamp
        const ipAddr = req.socket.remoteAddress;
        const verifiedHash = await auth.verifyPassword(req.body.password, data)
        if (!verifiedHash) return 403;
        const userData = { email: data.email, name: data.name, id: parseInt(data.user_id), permission_id: parseInt(data.permission_id) }
        const refreshTokenOpts = JSON.parse(JSON.stringify(client.JWToptions.RTOptions));
        let expiresIn = ms('7 days')
        if (rememberMe) {
            expiresIn = ms('90 days')
        }
        expiresIn = parseInt(expiresIn.toString().slice(0, -3))
        refreshTokenOpts.expiresIn = expiresIn
        const refreshToken = auth.genToken({ id: userData.id }, refreshTokenOpts, "refresh");
        const accessToken = auth.genToken(userData, null, "access");
        const ip = createHash('sha256').update(ipAddr).digest('hex'); // Convert IP address to SHA256 hash
        expiresIn = expiresIn + createdIn;
        const sessionID = await client.db.incr("session_id")
        await client.db.hset([`session:${sessionID}`, "session_id", sessionID, "user_id", userData.id, "jwt", refreshToken, "createdIn", createdIn, "expiresIn", expiresIn, "ip", ip, "rememberMe", 0]);
        await client.db.hset([`sessions.jwtid`, `${refreshToken}:${userData.id}`, sessionID]);
        client.expire(`session:${sessionID}`, ((rememberMe) ? ms('90 days') : ms('7 days')) / 1000); // Should automatically delete once the date has passed.
        return { email: data.email, refreshToken, accessToken, expiresIn: expiresIn };
    },
    setCookie: async (res: express.Response, name: string, value: string, expiresIn: number): Promise<boolean> => {
        res.cookie(name, value, { secure: true, httpOnly: true, maxAge: expiresIn, sameSite: 'strict' }); // Client Side wont access this because httpOnly.
        return true;
    },
    verifyPassword: async (password: string, data: any): Promise<boolean> => {
        const salt = Buffer.alloc((process.env.SALT.length * 2) - 1, process.env.SALT)
        return await argon2.verify(data.password, password, {
            type: argon2id,
            salt: salt,
            secret: Buffer.from(data.salt, 'hex')
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
    getUserData: async (req: express.Request, res: express.Response): Promise<Record<string, unknown> | boolean | number> => { // so ESLint can stop complaining
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
        const userData = { email: data.email, name: data.name, id: parseInt(data.user_id), permission_id: parseInt(data.permission_id) }
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
        const currentDate = parseInt(Date.now().toString().slice(0, -3))
        const accessToken = req.cookies.access_token;
        const refreshToken = req.cookies.jwt;
        const forbidden = () => (sendResponse) ? res.sendStatus(403) : 403;
        if (!accessToken || !refreshToken) return forbidden()
        if (!accessToken && !refreshToken && type == "both") return forbidden()
        let user_id: string;

        let refreshTokenValid: any;

        //let tokenInDB: Array<number>;
        let tokenInDB: any;

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
                user_id = refreshTokenValid.id
            } catch (e) {
                console.error(e)
                return (sendResponse) ? res.sendStatus(401) : 401;
            }
            
        }
        let accessTokenValid: any;
        if (["access", "both"].includes(type)) {
            try {
                accessTokenValid = jwt.verify(accessToken, process.env.ACCESS_TOKEN, client.JWToptions.ATOptions)
                if (!accessTokenValid) return (sendResponse) ? res.sendStatus(403) : 101; // Forbidden, 101 for allowing me to know if it needs to generate an Access Token.
                user_id = accessTokenValid.id;
            } catch (e) {
                console.error(e)
                return (sendResponse) ? res.sendStatus(401) : 101;
            }
        }
        if (type == "both") {
            if (refreshTokenValid.id != accessTokenValid.id) return forbidden() // Forbidden.
        }
        const userExists = await client.db.exists(`user:${user_id}`);
        if (!userExists) return (sendResponse) ? res.sendStatus(404) : 404;
        let response = {};
        switch (type) {
            case "both":
                response = { refreshToken, accessToken, user_id: tokenInDB[0], name: accessTokenValid.name, email: accessTokenValid.email, permission_id: accessTokenValid.permission_id }
                break;
            case "refresh":
                response = { refreshToken, user_id: tokenInDB[0] }
                break;
            case "access":
                response = { accessToken, user_id: user_id, name: accessTokenValid.name, email: accessTokenValid.email, permission_id: accessTokenValid.permission_id }
                break;
        }

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
    setClient: function(newClient: unknown): void { client = newClient; },
    run: async (req: express.Request, res: express.Response): Promise<unknown> => {
        res.set("Allow", "POST"); // To give the method of whats allowed
        if (req.method != "POST") return res.sendStatus(405) // If the request isn't POST then respond with Method not Allowed.
        if (req.cookies.jwt) return res.status(403).send("Already authenticated.")
        const { email, password, rememberMe } = req.body;
        if ([email, password].includes(undefined)) return res.status(406)
                                                             .send("Please enter in an Email, and Password.");
        const userID = await client.db.hexists('users.email', email); // Checks if the user exists.
        if (!userID) return res.sendStatus(404);
        const account = await client.db.hgetall(`user:${userID}`);
        if (!account) return res.sendStatus(404); // User doesn't exist.
        const loginToken = await auth.login(req, res, account, rememberMe);
        if (loginToken == 403) return res.sendStatus(403);
        auth.setCookie(res, "jwt", loginToken.refreshToken, loginToken.expiresIn);
        auth.setCookie(res, "access_token", loginToken.accessToken, loginToken.expiresIn);
        res.json(loginToken)
    }
}

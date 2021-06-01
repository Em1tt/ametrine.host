/**
 * API for authenticating a user on Amethyst.host
 */
import express                 from 'express';
import jwt                     from 'jsonwebtoken';
import argon2, { argon2id }    from 'argon2'
import { sql }                 from '../sql';
import { createHash }          from 'crypto';
import ms                      from 'ms';

export const auth = {
    login: async (req: express.Request, res: express.Response, data, rememberMe: boolean) => { // Logging in via amethyst.host
        const createdIn = parseInt(Date.now().toString().slice(0, -3)) // because for some reason node js decides to use an expanded timestamp
        const ipAddr = req.socket.remoteAddress;
        const salt = Buffer.alloc((process.env.SALT.length * 2) - 1, process.env.SALT)
        const verifiedHash = argon2.verify(data.password, req.body.password, {
                                           type: argon2id,
                                           salt: salt,
                                           secret: Buffer.from(data.salt, 'hex')
                                          })
        if (!verifiedHash) return 403;
        const userData = { email: data.email, name: data.name, id: data.user_id }
        const accessTokenOpts = sql.jwtOptions
        let expiresIn = ms('1h')
        if (rememberMe) {
            expiresIn = ms('90 days')
        }
        expiresIn = parseInt(expiresIn.toString().slice(0, -3))
        accessTokenOpts.expiresIn = expiresIn
        const accessToken = jwt.sign(userData, process.env.ACCESS_TOKEN, accessTokenOpts);
        const ip = createHash('sha256').update(ipAddr).digest('hex'); // Convert IP address to SHA256 hash
        res.cookie('jwt', accessToken, { secure: true, httpOnly: true, maxAge: expiresIn, sameSite: 'strict' }); // Client Side wont access this because httpOnly.
        expiresIn = expiresIn + createdIn;
        sql.db.prepare("INSERT INTO sessions (user_id, jwt, createdIn, expiresIn, ip) VALUES (?, ?, ?, ?, ?)").run(userData.id, accessToken, createdIn, expiresIn, ip) // Adds the token to DB in case the user decides to logout.
        return { email: data.email, accessToken: accessToken };
    },
    verifyToken: (user_id: number, req: express.Request, res: express.Response, sendResponse: boolean) => { // Probably not a good idea to do this, as most people use next()
        const currentDate = parseInt(Date.now().toString().slice(0, -3))
        const authorization = req.headers['authorization'];
        if (!authorization) return (sendResponse) ? res.sendStatus(403) : 403;
        const bearerToken = authorization.split(' ')[1];
        const tokenValid = jwt.verify(bearerToken, process.env.ACCESS_TOKEN, sql.jwtOptions)
        if (!tokenValid) return (sendResponse) ? res.sendStatus(403) : 403; // Forbidden.
        if (tokenValid.id != user_id) return (sendResponse) ? res.sendStatus(403) : 403; // Forbidden
        const ip = createHash('sha256').update(req.ip).digest('hex');
        const tokenInDB = sql.db.prepare('SELECT count(*) FROM sessions WHERE user_id = ? AND jwt = ? AND expiresIn < ? AND ip = ?').pluck().all(tokenValid.id, bearerToken, currentDate, ip);
        if (!tokenInDB) return (sendResponse) ? res.sendStatus(403) : 403;
        if (tokenValid.exp < currentDate) return (sendResponse) ? res.sendStatus(403) : 403;
        //res.setHeader('Authorization', 'Bearer ' + tokenValid)
        const response = { accessToken: bearerToken }
        return (sendResponse) ? res.status(200).json(response) : response;
    },
    discord: async (data) => { // Authenticating with Discord

    }
}

export const prop = {
    name: "auth",
    desc: "Authenticates a user (Logging in)",
    run: async (req: express.Request, res: express.Response) => {
        res.set("Allow", "POST"); // To give the method of whats allowed
        if (req.method != "POST") return res.sendStatus(405) // If the request isn't POST then respond with Method not Allowed.
        const { email, password, rememberMe } = req.body;
        if ([email, password].includes(undefined)) return res.status(406)
                                                                    .send("Please enter in an Email, and Password.");
        const account = await sql.db.prepare("SELECT user_id, name, email, password, salt, verified FROM users WHERE email = ?")
                                       .get(email); // Checks if the user exists.
        if (!account) return res.sendStatus(403); // User doesn't exist.
        const loginToken = await auth.login(req, res, account, rememberMe);
        if (loginToken == 403) return res.sendStatus(403);
        res.status(200).json(loginToken)
    }
}

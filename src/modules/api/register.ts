/**
 * API for creating an account on Amethyst.host
 */
import express                 from 'express';
import argon2, { argon2id }    from 'argon2'
import { sql }                 from '../sql';
import { randomBytes }         from 'crypto';
import { auth }                from './auth';

export const prop = {
    name: "register",
    desc: "Creates an account (Only on Website)",
    run: async (req: express.Request, res: express.Response) => {
        res.set("Allow", "POST"); // To give the method of whats allowed
        if (req.method != "POST") return res.sendStatus(405) // If the request isn't POST then respond with Method not Allowed.
        const { name, email, password } = req.body;
        if ([name, email, password].includes(undefined)) return res.status(406)
                                                                           .send("Please enter in a Name, Email, and Password.");
        const userExists = await sql.db.prepare("SELECT count(*) FROM users WHERE email = ?")
                                       .pluck().get(email); // Checks if the user exists.
        if (userExists) return res.status(409)
                                  .send("409 Existing Email Exists (Conflict)."); // User exists
        
        

        const MIN_PASS_LENGTH = 6; // Minimum password length
        const SECRET_LENGTH = 32

        if (MIN_PASS_LENGTH > password.length) return res.status(406)
                                                         .send("Password must not be less than 6 characters."); // User exists
        const userSalt = randomBytes(SECRET_LENGTH);
        const salt = Buffer.alloc((process.env.SALT.length * 2) - 1, process.env.SALT)
        const hashedPass = await argon2.hash(password, {type: argon2id, salt: salt, secret: userSalt});
        const registeredAt = Date.now()
        await sql.db.prepare('INSERT INTO users (registered, name, email, password, salt) VALUES (?, ?, ?, ?, ?)').run(registeredAt, name, email, hashedPass, userSalt.toString('hex'))
        const account = await sql.db.prepare('SELECT * FROM users WHERE email = ? AND name = ? AND registered = ?').get(email, name, registeredAt);
        const loginToken = await auth.login(req, res, account, false);
        if (loginToken == 403) return res.sendStatus(403);
        res.json(loginToken)
    }
}

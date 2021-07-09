/**
 * API for creating an account on Amethyst.host
 */
import express                 from 'express';
import { sql }                 from '../sql';
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

        const passResult = await auth.setPassword(password);
        if (passResult.result && passResult.result == 406) return res.status(406)
                                                                     .send("Password must not be less than 6 characters.");
        const registeredAt = Date.now()
        await sql.db.prepare('INSERT INTO users (registered, name, email, password, salt) VALUES (?, ?, ?, ?, ?)').run(registeredAt, name, email, passResult.password, passResult.salt)
        const account = await sql.db.prepare('SELECT * FROM users WHERE email = ? AND name = ? AND registered = ?').get(email, name, registeredAt);
        const loginToken = await auth.login(req, res, account, false);
        if (loginToken == 403) return res.sendStatus(403);
        res.json(loginToken)
    }
}

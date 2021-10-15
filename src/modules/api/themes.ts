/**
 * API for Themes on Ametrine.host
 */
import express                 from 'express';
import { sql }                 from '../sql';
import { permissions }         from '../permissions'
import { auth }                from './auth';

function encode_base64(str) {
    if (!str.length) return false;
        return btoa(encodeURIComponent(str));
}
function decode_base64(str) {
    if (!str.length) return false;
        return decodeURIComponent(atob(str));
}


// Copied from tickets.ts.
const settings = {
    maxTitle: 100, // Maximum Length for the name of the theme.
    maxDesc: 2000 // Maximum Length for descriotion.
}

let client;

export const prop = {
    name: "themes",
    desc: "Theme API",
    setClient: function(newClient) { client = newClient; },
    run: async (req: express.Request, res: express.Response): Promise<any> => {
        const allowedMethods = ["GET", "POST", "DELETE"];
        res.set("Allow", allowedMethods.join(", ")); // To give the method of whats allowed
        if (!allowedMethods.includes(req.method)) return res.sendStatus(405);
        const params = req.params[0].split("/").slice(1);
        let userData = await auth.verifyToken(req, res, false, "both");
        if (userData == 101) {
            const newAccessToken = await auth.regenAccessToken(req, res);
            if (typeof newAccessToken != "string") return false;
            userData = await auth.verifyToken(req, res, false, "both")
        }
        if (typeof userData != "object" && req.method != "GET") return res.sendStatus(userData);
        const paramName = params[0]
        switch (paramName) {
            default: {
                res.set("Allow", "GET");
                if (req.method != "GET") return res.sendStatus(405);
                let page = 1;
                let pageLimit = 10;
                let type = req.query.type; // Own, other? not sure
                if (!type) type = "null";
                let author = req.query.author; // Account ID
                if (!author) author = "null";
                if (req.query.page) page = parseInt(req.query.page.toString());
                if (req.query.limit) pageLimit = parseInt(req.query.limit.toString());
                const themes = sql.db.prepare('SELECT * FROM tickets ORDER BY dateCreated DESC LIMIT ? OFFSET ?').all(pageLimit, ((page - 1) * pageLimit));
                if (!themes.length) return res.sendStatus(404); // no themes?
                return res.json(themes.map(theme => {
                    const userName = sql.db.prepare('SELECT name FROM users WHERE user_id = ?').pluck().get(theme.themeAuthor); // Change to Username later when adding usernames to auth.ts
                    if (userName && userName.length) {
                        theme['userName'] = userName;
                        theme["themeName"] = decode_base64(theme["themeName"]);
                        theme["themeDesc"] = decode_base64(theme["themeDesc"]);
                        if (theme['themeDesc'].theme > 100) {
                            theme['themeDesc'] = theme['themeDesc'].slice(0, 100) + "...";
                        }
                        theme["dateCreated"] = new Date(theme["dateCreated"]);
                        return theme;
                    }
                }))
            }
            case "create": {
                const timestamp = Date.now();
                res.set("Allow", "POST");
                if (req.method != "POST") return res.sendStatus(405);
                const { name, description } = req.body;
                if (!name || !description) return res.sendStatus(406);
                if (name.length > settings.maxTitle) return res.status(403).send(`Title is too long. Max Length is ${settings.maxTitle}`);
                if (description.length > settings.maxDesc) return res.status(403).send(`Description is too long. Max Length is ${settings.maxDesc}`);
                await sql.db.prepare('INSERT INTO tickets (user_id, subject, content, category_ids, opened, createdIn) VALUES (?, ?, ?, ?, ?, ?)')
                            .run(userData["user_id"], encode_base64(name), encode_base64(description), timestamp);
                const getTicket = await sql.db.prepare('SELECT ticket_id, user_id, subject, content, opened FROM tickets WHERE user_id = ? AND subject = ? AND opened = ?').get(userData["user_id"], encode_base64(name), timestamp);
                if (!getTicket) return res.sendStatus(201)
                return res.status(201).json(getTicket);
            }
            case "delete": {
                res.set("Allow", "DELETE");
                if (req.method != "DELETE") return res.sendStatus(405);
                 let id = req.query.id;
                 if (!id) return res.sendStatus(406);
                 id = parseInt(id);
                 const findTheme = sql.db.prepare('SELECT themeAuthor FROM tickets WHERE theme_id = ?').get(id);
                 if (!findTheme) return res.sendStatus(404);
                 if (findTheme.themeAuthor != userData["user_id"]) return res.sendStatus(403);
                 await sql.db.prepare('DELETE FROM tickets WHERE theme_id = ?').run(id);
                 return res.sendStatus(204);
            }
         }
     }
 }
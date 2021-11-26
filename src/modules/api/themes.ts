/**
 * API for Themes on Ametrine.host
 */
import express                 from 'express';
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

function paginate(array: Array<unknown>, page_size: number, page_number: number): Array<unknown> { // https://stackoverflow.com/a/42761393
    // human-readable page numbers usually start with 1, so we reduce 1 in the first argument
    return array.slice((page_number - 1) * page_size, page_number * page_size);
}

export const prop = {
    name: "themes",
    desc: "Theme API",
    setClient: async function(newClient) { client = newClient; },
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
                return client.keys(`theme:?`, async function (err, result) {
                    if (err) {
                        console.error(err);
                        return res.status(500).send("Error occured while retrieving keys for themes. Please report this.")
                    }
                    let themes: Array<unknown> = await Promise.all(result.map(async themeID => {
                        const theme = await client.db.hgetall(themeID);
                        return theme;
                    }));
                    if (!themes.length) return res.sendStatus(404);
                    themes = paginate(themes.sort((a,b) => (a["dateCreated"] as number) - (b["dateCreated"] as number)), pageLimit, page);
                    return res.status(200).json(await Promise.all(themes.map(async theme => {
                        const userName = await client.db.hget(`user:${theme["themeAuthor"]}`, 'name');
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
                    })));
                })
            }
            case "create": {
                // Themes are currently not planned
                return res.sendStatus(404);
            }
            case "delete": {
                res.set("Allow", "DELETE");
                if (req.method != "DELETE") return res.sendStatus(405);
                let id = req.query.id;
                if (!id) return res.sendStatus(406);
                id = parseInt(id);
                const findTheme = await client.db.hgetall(`theme:${id}`);
                if (!findTheme) return res.sendStatus(404);
                if (findTheme["themeAuthor"] != userData["user_id"]) return res.sendStatus(403);
                return client.del(`theme:${findTheme["theme_id"]}`, function (err) {
                    if (err) {
                        console.error(err);
                        return res.status(500).send("Error occured while deleting the theme. Please report this.")
                    }
                    return res.sendStatus(204);
                })
            }
         }
     }
 }
import express                 from 'express';
import { permissions }         from '../permissions'
import { auth }                from './auth';
import { cdn }                 from '../cdn';
import { utils }               from '../utils'
let client;
 
export const prop = {
    name: "cdn",
    desc: "API for uploading files to CDN server",
    rateLimit: {
       max: 5,
       time: 30 * 1000
    },
    setClient: function(newClient: unknown): void { client = newClient; },
    run: async (req: express.Request, res: express.Response): Promise<any> => {
        if (!client) return res.status(500).send("Redis Client not available.");
        const allowedMethods = ["PATCH", "POST", "DELETE"];
        res.set("Allow", allowedMethods.join(", ")); // To give the method of whats allowed
        if (!allowedMethods.includes(req.method)) return res.sendStatus(405);
        let userData = await auth.verifyToken(req, res, false, "both");
        if (userData == 101) {
            const newAccessToken = await auth.regenAccessToken(req, res);
            if (typeof newAccessToken != "string") return false;
            userData = await auth.verifyToken(req, res, false, "both")
        }
        if (typeof userData != "object") return res.sendStatus(userData);
        if (!permissions.hasPermission(userData['permission_id'], `/cdn`)) return res.sendStatus(403);
        switch (req.method) {
            case "POST": {
                const { category, name, data } = req.body;
                return cdn.upload("assets/" + category, name, data, false).then(() => {
                    const hostURI = (req.get('host') == "ametrine.host") ? "cdn.ametrine.host" : "localhost:3001"
                    res.status(200).json({
                        link: `${req.protocol + '://' + hostURI}/assets/${category}/${name}`
                    })
                }).catch(e => {
                    console.error(e);
                    res.status(500).send("There was an error while trying to upload the file!")
                });
            }
            case "DELETE": {
                const { category, name } = req.body;
                if (!category || !name) return res.status(406).send("Missing category or name.");
                //cdn.delete("f", "d");
                break;
            }
        }
    }
}
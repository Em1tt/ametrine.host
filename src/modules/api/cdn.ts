import express                 from 'express';
import { permissions }         from '../permissions'
import { auth }                from './auth';
import { cdn }                 from '../cdn';
import { Redis }               from "../../types/redis";
let client: Redis;
 
export const prop = {
    name: "cdn",
    desc: "API for uploading files to CDN server",
    rateLimit: {
       max: 5,
       time: 30 * 1000
    },
    setClient: function(newClient: Redis): void { client = newClient; },
    run: async (req: express.Request, res: express.Response): Promise<unknown> => {
        if (!client) return res.status(500).send("Redis Client not available.");
        const allowedMethods = ["PATCH", "POST", "DELETE"];
        res.set("Allow", allowedMethods.join(", ")); // To give the method of whats allowed
        if (!allowedMethods.includes(req.method)) return res.sendStatus(405);
        const userData = res.locals.userData;
        if (typeof userData != "object") return res.sendStatus(res.locals.userDataErr);
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
            case "PATCH": {
                const { category, name, data, newName } = req.body;
                if (newName.length) {
                    return cdn.rename("assets/" + category, name, newName).then(() => {
                        res.sendStatus(200);
                    }).catch(e => {
                        console.error(e);
                        res.status(500).send("There was an error while trying to upload the file!")
                    });
                }
                if (data.length) {
                    return cdn.delete("assets/" + category, name).then(() => {
                        return cdn.upload("assets/" + category, name, data, false).then(() => {
                            const hostURI = (req.get('host') == "ametrine.host") ? "cdn.ametrine.host" : "localhost:3001"
                            res.status(200).json({
                                link: `${req.protocol + '://' + hostURI}/assets/${category}/${name}`
                            })
                        }).catch(e => {
                            console.error(e);
                            res.status(500).send("There was an error while trying to upload the file!")
                        });
                    }).catch(e => {
                        console.error(e);
                        res.status(500).send("There was an error while trying to upload the file!")
                    });
                }
                break;
            }
            case "DELETE": {
                const { category, name } = req.body;
                if (!category || !name) return res.status(406).send("Missing category or name.");
                return cdn.delete("assets/" + category, name).then(() => {
                    res.sendStatus(204);
                }).catch(e => {
                    console.error(e);
                    res.status(500).send("There was an error while trying to upload the file!")
                });
            }
            default:
                return res.sendStatus(404);
        }
    }
}
/**
 * API for Showing announcements (or posting)
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
let client;

export const prop = {
    name: "announcements",
    desc: "API for Announcements",
    rateLimit: {
       max: 10,
       time: 30 * 1000
    },
    setClient: function(newClient) { client = newClient; },
    run: async (req: express.Request, res: express.Response): Promise<any> => {
        if (!client) return res.status(500).send("Redis Client not available.");
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
        switch (req.method) {
            case "GET": { // Fetching the latest announcement.
                let type = req.query.type; // Announcement Type
                if (!type) type = "null";
                if (!["outage", "news", "warning", "null"].includes(type.toString().toLowerCase())) return res.sendStatus(406);
                return client.keys("announcement:?", async function (err, result) {
                    if (err) {
                        console.error(err);
                        return res.status(500).send("Error occured while retrieving keys for announcement. Please report this.")
                    }
                    let announcements = JSON.parse(JSON.stringify(await Promise.all(result.map(async announcementID => {
                        return {...await client.db.hgetall(announcementID), announcementID}
                    })))) // ESLint errors if I do not do this.
                    announcements = announcements.filter(announcement => {
                        if (typeof userData != "object" && announcement["showToCustomersOnly"] == 1) {
                            return null;
                        } else {
                            if (type != "null") {
                                if (type == announcement.announcementType) return announcement;
                                return null;
                            }
                            return announcement;
                        }
                    }).sort((a, b) => {
                        return parseInt(b.dateCreated) - parseInt(a.dateCreated)
                    }).filter(a => a != null);
                    if (!announcements.length) return res.json([]);
                    if (!req.query.hasPermission) req.query.hasPermission = 0;
                    announcements = announcements.filter(announcement => announcement.showToCustomersOnly <= req.query.hasPermission);
                    if (announcements.showToCustomersOnly && typeof userData != "object") return res.sendStatus(403); // Forbidden from viewing announcement.
                    return res.status(200).json(announcements.map(announcement => {
                        announcement.announcementText = decode_base64(announcement.announcementText);
                        return announcement;
                    }));
                })
            }
            case "POST": { // For creating an announcement.
                if (!permissions.hasPermission(userData['permission_id'], `/announcements`)) return res.sendStatus(403);
                const announcement = req.body.text; // Announcement Text
                const type = req.body.type; // Announcement Type
                let deleteOn = req.body.deleteOn; // When to delete the announcement
                let showCustomers = req.body.showToCustomersOnly; // If it should only show to customers
                deleteOn = parseInt(deleteOn);
                if (!announcement && !type && !deleteOn && !showCustomers) return res.sendStatus(406);
                if (!["outage", "news", "warning"].includes(type.toString())) return res.status(406).send("Invalid type");
                const currentDate = Date.now();
                if (deleteOn < currentDate) return res.status(406).send(`Invalid Timestamp (Cannot be higher than ${currentDate})`);
                if (isNaN(deleteOn)) return res.status(406).send("Invalid Timestamp")
                if (!["0","1","true","false"].includes(showCustomers.toString())) return res.status(406).send("Show Customers must be true or false.")
                switch (showCustomers.toString()) {
                    case "true": showCustomers = 1; break;
                    case "false": showCustomers = 0; break;
                }
                return client.incr("announcement_id", async function(err, announcementID) {
                    if (err) {
                        console.error(err);
                        return res.status(500).send("Error occured while incrementing announcement ID. Please report this.")
                    }
                    await client.db.hset([`announcement:${announcementID}`, "announcementType", type, "announcementText", encode_base64(announcement), "deleteIn", deleteOn, "showToCustomersOnly", showCustomers, "dateCreated", currentDate]);
                    return res.status(200).json({announcement_id: announcementID})
                    /*client.sadd(`announcements`, announcementID, function(err) {
                        if (err) return console.error(err);
                        return res.status(200).json({announcement_id: announcementID})
                    });*/
                    // Above may not be required as we don't need to index announcements.
                });
            }
            case "DELETE": { // For deleting an announcement.
                if (!permissions.hasPermission(userData['permission_id'], `/announcements`)) return res.sendStatus(403);
                const id = req.body.type;
                console.log(req.body)
                if (!id) return res.sendStatus(406);
                const findAnnouncement = await client.db.exists(`announcement:${id}`)
                if (!findAnnouncement) return res.sendStatus(404); // Announcement not found.
                client.del(`announcement:${id}`, function (err, result) {
                    if (err) {
                        console.error(err);
                        return res.status(500).send("Error occured while deleting the announcement. Please report this.")
                    }
                    return res.sendStatus(204);
                })
            }
        }
    }
}
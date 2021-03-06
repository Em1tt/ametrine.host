/**
 * API for Showing announcements (or posting)
 */
import express                 from 'express';
import { permissions }         from '../permissions'
import { auth }                from './auth';
import { Announcement }        from '../../types/billing/announcement';
import { utils }               from '../utils'
import { Redis }               from "../../types/redis";
let client: Redis;

export const prop = {
    name: "announcements",
    desc: "API for Announcements",
    rateLimit: {
       max: 10,
       time: 30 * 1000
    },
    setClient: function(newClient: Redis): void { client = newClient; },
    run: async (req: express.Request, res: express.Response): Promise<unknown> => {
        if (!client) return res.status(500).send("Redis Client not available.");
        const allowedMethods = ["GET", "POST", "DELETE"];
        res.set("Allow", allowedMethods.join(", ")); // To give the method of whats allowed
        if (!allowedMethods.includes(req.method)) return res.sendStatus(405);
        //const params = req.params[0].split("/").slice(1);
        const userData = res.locals.userData;
        if (typeof userData != "object") return res.sendStatus(res.locals.userDataErr);
        switch (req.method) {
            case "GET": { // Fetching the latest announcement.
                let type = req.query.type; // Announcement Type
                if (!type) type = "null";
                if (!["outage", "news", "warning", "null"].includes(type.toString().toLowerCase())) return res.status(406).send('Query "type" has an invalid value.');
                return client.keys("announcement:*", async function (err, result) {
                    if (err) {
                        console.error(err);
                        return res.status(500).send("An error occurred while retrieving the announcements. Please report this.")
                    }
                    let announcements: Array<Announcement> = await Promise.all(result.map(async announcementID => {
                        return { announcement_id: parseInt(announcementID.split(":")[1]), ...await client.db.hgetall(announcementID) }
                    })) // This is much better
                    announcements = announcements.filter(announcement => {
                        if (typeof userData != "object" && announcement.showToCustomersOnly == 1) {
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
                    if (!announcements.length) return res.sendStatus(404);
                    if (!req.query.hasPermission || req.query.hasPermission == undefined) req.query.hasPermission = 0;
                    announcements = announcements.filter(announcement => announcement.showToCustomersOnly <= req.query.hasPermission);
                    if (announcements[0].showToCustomersOnly == 1 && typeof userData != "object") return res.sendStatus(403); // Forbidden from viewing announcement.
                    return res.status(200).json(announcements.map(announcement => {
                        announcement.announcementText = utils.decode_base64(announcement.announcementText as string);
                        return announcement;
                    }));
                })
            }
            case "POST": { // For creating an announcement.
                if (!permissions.hasPermission(userData['permission_id'], `/announcements`)) return res.sendStatus(403);
                const announcement = req.body.text; // Announcement Text
                const type = req.body.type; // Announcement Type
                const deleteOn = parseInt(req.body.deleteOn);
                const currentDate = Math.floor(Date.now() / 1000);
                if (deleteOn && (isNaN(deleteOn) || (deleteOn < currentDate))) return res.status(406).send(`Invalid Timestamp. Timestamps cannot be in the past and must be a numeric value.`);
                let showCustomers = req.body.showToCustomersOnly; // If it should only show to customers
                if (!announcement || !type || !deleteOn || !showCustomers) return res.status(406).send('Body is missing the required values (announcement, type, deleteOn, showCustomers)');
                if (!["outage", "news", "warning"].includes(type.toString())) return res.status(406).send('Query "type" has an invalid value.');
                if (isNaN(deleteOn)) return res.status(406).send("Invalid Timestamp")
                if (!["0","1","true","false"].includes(showCustomers.toString())) return res.status(406).send("Show Customers must be true or false.")
                console.log(deleteOn, currentDate);
                switch (showCustomers.toString()) {
                    case "true": showCustomers = 1; break;
                    case "false": showCustomers = 0; break;
                }
                return client.incr("announcement_id", async function(err, announcementID) {
                    if (err) {
                        console.error(err);
                        return res.status(500).send("Error occured while incrementing announcement ID. Please report this.")
                    }
                    function addDays(date, days) {
                        const result = new Date(date);
                        result.setDate(result.getDate() + days);
                        return new Date(result).getTime();
                    }
                    await client.db.hset([`announcement:${announcementID}`, "announcement_id", announcementID, "announcementType", type, "announcementText", utils.encode_base64(announcement), "showToCustomersOnly", showCustomers, "dateCreated", currentDate*1000, "deleteIn", addDays(deleteOn,1)]);
                    client.expire(`announcement:${announcementID}`, deleteOn/1000 - currentDate);
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
                const id = req.body.id;
                if (!id) return res.sendStatus(406);
                const findAnnouncement = await client.db.exists(`announcement:${id}`)
                if (!findAnnouncement) return res.sendStatus(404); // Announcement not found.
                client.del(`announcement:${id}`, function (err) {
                    if (err) {
                        console.error(err);
                        return res.status(500).send("Error occurred while deleting the announcement. Please report this.")
                    }
                    return res.sendStatus(204);
                })
            }
        }
    }
}

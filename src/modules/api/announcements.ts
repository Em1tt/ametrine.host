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

export const prop = {
     name: "announcements",
     desc: "API for Announcements",
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
        switch (req.method) {
            case "GET": { // Fetching the latest announcement.
                let type = req.query.type; // Announcement Type
                if (!type) type = "null";
                if (!["outage", "news", "warning", "null"].includes(type.toString().toLowerCase())) return res.sendStatus(406);
                const params: Array<any> = [Date.now()]; // ESLint wont stop complaining about this.
                let query = "SELECT announcementText, showToCustomersOnly, announcementType, dateCreated FROM announcements WHERE deleteIn > ?";
                if (type != "null") {
                    query += " AND announcementType = ?"
                    params.push(type);
                } else if (typeof userData != "object") {
                    query += " AND showToCustomersOnly = 0"
                }
                query += " ORDER BY dateCreated DESC";
                const announcements = await sql.db.prepare(query).all(params);
                if (!announcements.length) return res.json([]); // Announcement not found
                if (announcements.showToCustomersOnly && typeof userData != "object") return res.sendStatus(403); // Forbidden from viewing announcement.
                return res.status(200).json(announcements.map(announcement => {
                    announcement.announcementText = decode_base64(announcement.announcementText);
                    return announcement;
                }));
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
                await sql.db.prepare(`INSERT INTO announcements
                                    (announcementType, announcementText, deleteIn, showToCustomersOnly, dateCreated) VALUES
                                    (?, ?, ?, ?, ?)`).run(type, encode_base64(announcement), deleteOn, showCustomers, currentDate);
                const getAnnouncementID = await sql.db.prepare('SELECT announcement_id FROM announcements WHERE deleteIn = ? AND announcementType = ? AND announcementText = ?')
                                                      .get(deleteOn, type, encode_base64(announcement));
                if (!getAnnouncementID) return res.sendStatus(204);
                return res.status(200).json(getAnnouncementID)
            }
            case "DELETE": { // For deleting an announcement.
                if (!permissions.hasPermission(userData['permission_id'], `/announcements`)) return res.sendStatus(403);
                const id = req.query.type;
                if (!id) return res.sendStatus(406);
                const findAnnouncement = sql.db.prepare('SELECT count(*) FROM announcements WHERE announcement_id = ?').pluck().get(id);
                if (!findAnnouncement) return res.sendStatus(404); // Announcement not found.
                await sql.db.prepare('DELETE FROM announcements WHERE announcement_id = ?').run(id);
                return res.sendStatus(204);
            }
        }
    }
}
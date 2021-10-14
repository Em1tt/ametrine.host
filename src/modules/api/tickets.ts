/**
 * API for the Support Ticket System
 */
import express                 from 'express';
import { sql }                 from '../sql';
import { auth }                from './auth';
import { permissions }         from '../permissions'
import ticket_categories       from '../../ticket_categories.json';

function encode_base64(str) {
    if (!str.length) return false;
    return btoa(encodeURIComponent(str));
}
function decode_base64(str) {
    if (!str.length) return false;
    return decodeURIComponent(atob(str));
}

const settings = {
    maxTitle: 100, // Maximum Length for the title of the ticket.
    maxBody: 2000, // Maximum Length for messages.
    maxUploadLimit: 12 // 12 MB limit for files/images.
}

/**
 * Allowed Method
 * @param req Request
 * @param res Response
 * @param type Type of whats allowed (GET, POST, etc)
 * @param paramName The name of the parameter
 * @param userData userData
 * @returns boolean
 */
function allowedMethod(req: express.Request, res: express.Response, type: Array<string>, paramName: string, userData: any): boolean {
    if (!permissions.hasPermission(userData['permission_id'], `/tickets/${paramName}`)) {
        res.sendStatus(403);
        return false;
    }
    res.set("Allow", type.join(", "));
    if (!type.includes(req.method)) {
        res.sendStatus(405);
        return false;
    }
    return true;
}
function editContent(content, timestamp, ticket_id) {
    sql.db.prepare('UPDATE tickets SET content = ?, editedIn = ? WHERE ticket_id = ?').run(content, timestamp, ticket_id);
}
let client;
export const prop = {
    name: "tickets",
    desc: "Support Ticket System",
    rateLimit: {
        max: 20,
        time: 10 * 1000
    },
    setClient: function(newClient) { client = newClient; },
    run: async (req: express.Request, res: express.Response): Promise<any> => {
        const allowedMethods = ["GET", "POST", "PATCH", "PUT", "DELETE"];
        const params = req.params[0].split("/").slice(1); // Probably a better way to do this in website.ts via doing /api/:method/:optionalparam*? but it doesnt work for me.
        res.set("Allow", allowedMethods.join(", ")); // To give the method of whats allowed
        if (!allowedMethods.includes(req.method)) return res.sendStatus(405) // If the request isn't included from allowed methods, then respond with Method not Allowed.
        let userData = await auth.verifyToken(req, res, false, "both") //true
        if (userData == 101) {
            const newAccessToken = await auth.regenAccessToken(req, res);
             if (typeof newAccessToken != "string") return false;
             userData = await auth.verifyToken(req, res, false, "both")
         }
         if (typeof userData != "object") return res.sendStatus(userData);
         const timestamp = Date.now();
         let paramName = params[0]
         if (!isNaN(parseInt(paramName))) {
             paramName = ":ticketid";
         }
         let level = userData['permission_id'];
         if (typeof level === "string"){
             level = level.split(":");
         }
         if ([3,4].includes(parseInt(level[0]))) { // Developer & Administrator
             level = 5;
         }
         if (level[1]) { // Support Level
             level = parseInt(level[1])
         }
 
         function newMsg(msg) {
             //msg["content"] = decode_base64(msg["content"]);
             msg["createdIn"] = new Date(msg["createdIn"]);
             msg["editedIn"] = (msg["editedIn"] == 0) ? null : new Date(msg["editedIn"]);
             return msg;
         }
         function newTicket(ticket) {
             const name = sql.db.prepare('SELECT name FROM users WHERE user_id = ?').pluck().get(ticket.user_id);
             if (name && name.length) {
                 ticket['name'] = name;
                 if (ticket['content'].length > 100) {
                     ticket['content'] = ticket['content'].slice(0, 100);
                 }
                 ticket["subject"] = decode_base64(ticket["subject"]);
                 //ticket["content"] = decode_base64(ticket["content"]);
                 ticket["opened"] = new Date(ticket["opened"]);
                 ticket["editedIn"] = (ticket["editedIn"] == 0) ? null : new Date(ticket["editedIn"]);
                 ticket["closed"] = (ticket["closed"] == 0) ? null : new Date(ticket["closed"]);
                 return ticket;
             }
             return null;
         }
 
         switch (paramName) {
             case "create": {// Creates the ticket.
                 if (allowedMethod(req, res, ["POST"], paramName, userData)) {
                     const { subject, content, categories } = req.body;
                     if (!subject || !content) return res.sendStatus(406);
                     // subject=Hello World&content=Lorem ipsum dolor sit amet, consectetur...&categories=0,1,2
                     if (subject.length > settings.maxTitle) return res.status(403).send(`Subject is too long. Max Length is ${settings.maxTitle}`);
                     if (content.length > settings.maxBody) return res.status(403).send(`Content is too long. Max Length is ${settings.maxBody}`);
                     const category_ids = (categories) ? categories.split(",").map(category => {
                         const findCategory = ticket_categories.find(cate => cate.id == parseInt(category));
                         if (findCategory) {
                             category = parseInt(category); // Converting it to Int in case of any strings at the end.
                             return category;
                         }
                     }) : []
                     await sql.db.prepare('INSERT INTO tickets (user_id, subject, content, category_ids, opened, createdIn) VALUES (?, ?, ?, ?, ?, ?)')
                                 .run(userData["user_id"], encode_base64(subject), JSON.stringify(content), category_ids.join(","), timestamp, timestamp);
                     const getTicket = await sql.db.prepare('SELECT ticket_id, user_id, subject, content, opened FROM tickets WHERE user_id = ? AND subject = ? AND opened = ?').get(userData["user_id"], encode_base64(subject), timestamp);
                     if (!getTicket) return res.sendStatus(201)
                     return res.status(201).json(getTicket);
                 }
                 break;
             }
             case "categories": { // Categories
                 res.set("Allow", "GET");
                 if (req.method != "GET") return res.sendStatus(405);
                 return res.status(200).json(ticket_categories);
             }
             case "list": { // Lists the tickets
                 if (allowedMethod(req, res, ["GET"], paramName, userData)) {
                    let page = 1;
                    let status = -1;
                    const statusQuery = (["opened","closed"].includes(req.query.status)) ? " AND status = ?" : "";   
                    let pageLimit = 10;
                    if (req.query.page) page = parseInt(req.query.page.toString());
                    if (req.query.status == "closed") status = 1;
                    if (req.query.status == "opened") status = 0;
                    if (req.query.limit) pageLimit = parseInt(req.query.limit.toString());
                    if (isNaN(pageLimit)) pageLimit = 10;
                    if (isNaN(page)) page = 1;
                    let tickets = [];
                    const elements = [userData["user_id"]]
                    if (status != -1) elements.push(status)
                    if (typeof level != 'object') { // fix forbidden bug
                        if (pageLimit > 10) pageLimit = 10; // Users will have access to less pages, just in case.
                        elements.push(pageLimit, (page - 1) * pageLimit);
                        tickets = await sql.db.prepare('SELECT ticket_id, user_id, subject, content, category_ids, status, opened, closed, editedIn, level FROM tickets WHERE user_id = ?' + statusQuery + ' ORDER BY opened ASC LIMIT ? OFFSET ?')
                                              .all(elements);
                    } else {
                        if (level > 5 || level < 3) return res.sendStatus(403);
                        if (pageLimit > 50) pageLimit = 50; // Making sure server isn't vulnerable to this kind of attack.
                        elements[0] = (level + 1)
                        elements.push(pageLimit, (page - 1) * pageLimit);
                        tickets = await sql.db.prepare('SELECT ticket_id, user_id, subject, content, category_ids, status, opened, closed, editedIn, level FROM tickets WHERE level < ?' + statusQuery + ' ORDER BY opened ASC LIMIT ? OFFSET ?')
                                              .all(elements);
                    }
                    /*const result = tickets.map(ticket => {
                        const name = sql.db.prepare('SELECT name FROM users WHERE user_id = ?').pluck().get(ticket.user_id);
                        if (name && name.length) {
                            ticket['name'] = name;
                            if (ticket['content'].length > 100) {
                                ticket['content'] = ticket['content'].slice(0, 100);
                            }
                            return ticket;
                        }
                    });*/
                    return res.status(200).json(tickets.map(newTicket));
                 }
                 break;
             }
             case ":ticketid": { // Ticket ID
                 const ticketID = parseInt(params[0])
                 if (params[1]) { // Without api/tickets/:ticketid/:msgid
                     if (allowedMethod(req, res, ["GET", "PATCH", "DELETE"], paramName, userData)) { // copy paste
                         if (ticketID < 0) return res.sendStatus(406);
                         const getTicket = await sql.db.prepare('SELECT ticket_id, user_id, subject, content, level, category_ids, opened, closed, editedIn, level FROM tickets WHERE ticket_id = ?')
                                                       .get(ticketID);
                         if (!getTicket) return res.status(404).send("Ticket not found."); // If no tickets are found.
                         if (getTicket.user_id != userData["user_id"] && userData["permission_id"] != `2:${getTicket.level}`) return res.sendStatus(403);
                         const msgID = parseInt(params[1])
                         if (msgID < 0) return res.sendStatus(406);
                         const getMessage = await sql.db.prepare('SELECT msg_id, ticket_id, user_id, content, files, createdIn, editedIn FROM ticket_msgs WHERE ticket_id = ? AND msg_id = ?')
                                                        .get(ticketID, msgID);
                         if (!getMessage) return res.status(404).send("Message not found."); // If no message is found.
                         const { content } = req.body;
                         switch (req.method) {
                             case "GET": { // Viewing the contents of a message (Not really sure why you would want to do this but it's there.)
                                 return res.status(200).json(newMsg(getMessage));
                             }
                             case "PATCH": { // Editing the message.
                                 if (getMessage.user_id != userData["user_id"]) return res.sendStatus(403);
                                 const newContent = JSON.stringify(content);
                                 await sql.db.prepare('UPDATE ticket_msgs SET content = ?, editedIn = ? WHERE ticket_id = ? AND msg_id = ?').run(newContent, timestamp, getTicket["ticket_id"], getMessage["msg_id"])
                                 getMessage["content"] = newContent;
                                 getMessage["editedIn"] = timestamp;
                                 return res.status(200).json(newMsg(getMessage));
                             }
                             case "DELETE": { // Deleting a message
                                 await sql.db.prepare('DELETE FROM ticket_msgs WHERE msg_id = ? AND ticket_id = ?').run(getMessage["msg_id"], getTicket["ticket_id"]);
                                 return res.sendStatus(204);
                             }
                             default:
                                 return res.sendStatus(404); // This should never happen.
                         }
                     }
                 } else {
                     if (allowedMethod(req, res, ["GET", "POST", "PUT", "DELETE"], paramName, userData)) {
                         if (ticketID < 0) return res.sendStatus(406);
                         const getTicket = await sql.db.prepare('SELECT ticket_id, user_id, subject, content, level, category_ids, opened, closed, editedIn, level FROM tickets WHERE ticket_id = ?')
                                                         .get(ticketID); // ESLint wants me to use const
                         if (!getTicket) return res.status(404).send("Ticket not found."); // If no tickets are found.
                         if (getTicket.user_id != userData["user_id"] && userData["permission_id"] != `2:${getTicket.level}`) return res.sendStatus(403);
                         const { content } = req.body;
                         // Using {} at switch cases because ESLint is complaining
                         
                         switch (req.method) {
                             case "GET": { // Viewing the Ticket Conversation.
                                 let page = 1;
                                 let pageLimit = 10;
                                 if (req.query.page) page = parseInt(req.query.page.toString());
                                 if (req.query.limit) pageLimit = parseInt(req.query.limit.toString());
                                 if (isNaN(pageLimit)) pageLimit = 10;
                                 if (isNaN(page)) page = 1;
                                 
                                 let messages = await sql.db.prepare('SELECT msg_id, user_id, content, files, createdIn, editedIn FROM ticket_msgs WHERE ticket_id = ? ORDER BY createdIn DESC LIMIT ? OFFSET ?')
                                                             .all(ticketID, pageLimit, ((page - 1) * pageLimit));
                                 if (messages.length) { // If there are messages
                                     messages = messages.map(newMsg);
                                     getTicket['msgs'] = messages;
                                 }
                                 
                                 return res.status(200).json(newTicket(getTicket));
                             }
                             case "POST": { // Sends a new message to that ticket. (Responds with the message content)
                                 if (!content) return res.sendStatus(406);
                                 if (content.length > settings.maxBody) return res.status(403).send(`Content is too long. Max Length is ${settings.maxBody}`);
                                 
                                 await sql.db.prepare('INSERT INTO ticket_msgs (ticket_id, user_id, content, createdIn) VALUES (?, ?, ?, ?)')
                                             .run(getTicket["ticket_id"], userData["user_id"], JSON.stringify(content), timestamp);
                                 const getMsg = await sql.db.prepare('SELECT msg_id, ticket_id, user_id, content, createdIn FROM ticket_msgs WHERE user_id = ? AND content = ? AND createdIn = ?').get(userData["user_id"], JSON.stringify(content), timestamp);
                                 if (!getMsg) return res.sendStatus(201);
                                 return res.status(201).json(getMsg);
                             }
                             case "PUT": { // Updates the status on the ticket (Either opening it again after being closed, setting tags, etc)
                                 const { closed, subject, categories, reopen, priority, content } = req.body;
                                 let updated = false;
 
                                 /**
                                  * closed (closed=1) - Close the ticket
                                  * subject (subject=Hello World) - Subject of the Ticket (title)
                                  * content (content=Lorem ipsum dolor...) - Content of the Ticket.
                                  * categories (categories=0,1) - Categories for the ticket.
                                  * reopen (reopen=1) - Reopens the ticket
                                  */
 
                                 if (closed && closed == "1" && !reopen) { // If closed is provided, close the ticket.
                                     if (getTicket["closed"] != 0) return res.sendStatus(204);
                                     sql.db.prepare('UPDATE tickets SET status = 1, closed = ? WHERE ticket_id = ?').run(timestamp, getTicket["ticket_id"]);
                                     updated = true;
                                 }
                                 if (reopen && reopen == "1") { // If reopen is provided, Open the ticket again.
                                     if (getTicket["closed"] == 0) return res.sendStatus(406);
                                     sql.db.prepare('UPDATE tickets SET status = 0, opened = ?, closed = 0 WHERE ticket_id = ?').run(timestamp, getTicket["ticket_id"]);
                                     updated = true;
                                 }
 
                                 
                                 //if (getTicket["closed"] != 0) return res.sendStatus(406); // If ticket is closed
                                 if (getTicket["user_id"] != userData["user_id"]) return res.sendStatus(403); // No Staff is allowed to change the users title and content.
                                 if (subject && subject.length) {
                                     sql.db.prepare('UPDATE tickets SET subject = ?, editedIn = ? WHERE ticket_id = ?').run(encode_base64(subject), timestamp, getTicket["ticket_id"]);
                                     if (content) {
                                         editContent(JSON.stringify(content), timestamp, getTicket["ticket_id"])
                                     }
                                     updated = true;
                                 }
                                 if (content) {
                                     editContent(JSON.stringify(content), timestamp, getTicket["ticket_id"]);
                                     updated = true;
                                 }
                                 if (categories && categories.length) {
                                     let category_ids = []
                                     console.log(typeof categories)
                                     if (typeof categories == "string") {
                                         category_ids = (categories) ? categories.split(",").map(category => { // TS is telling me that number cant be converted to string when parseInt on this, but it works on the else statement
                                             const findCategory = ticket_categories.find(cate => cate.id == category);
                                             if (findCategory) {
                                                 //category = parseInt(category); // Converting it to Int in case of any strings at the end.
                                                 return category;
                                             }
                                         }) : []
                                     } else {
                                         category_ids = categories.map(category => {
                                             const findCategory = ticket_categories.find(cate => cate.id == parseInt(category));
                                             if (findCategory) {
                                                 category = parseInt(category); // Converting it to Int in case of any strings at the end.
                                                 return category;
                                             }
                                         })
                                     }
                                     if (!category_ids.length) return res.sendStatus(406);
                                     sql.db.prepare('UPDATE tickets SET category_ids = ? WHERE ticket_id = ?').run(category_ids.join(","), getTicket["ticket_id"]);
                                     updated = true;
                                 }
                                 if (priority && priority !== null){
                                     sql.db.prepare('UPDATE tickets SET priority = ? WHERE ticket_id = ?').run(priority, getTicket["ticket_id"]);
                                     updated = true;
                                 }
                                 return (updated) ? res.sendStatus(204) : res.sendStatus(406)
                             }
                             case "DELETE": { // Closes the Ticket.
                                 if (permissions.hasPermission(userData['permission_id'], `/tickets/:ticketid/delete`) && req.body.force) { // Force delete a message. (Used for spam tickets)
                                     await sql.db.prepare('DELETE FROM tickets WHERE ticket_id = ?').run(getTicket["ticket_id"]);
                                     if (req.body.msgs) {
                                         await sql.db.prepare('DELETE FROM ticket_msgs WHERE ticket_id = ?').run(getTicket["ticket_id"]);
                                     }
                                     return res.sendStatus(204);
                                 } else { // Closing a ticket. (Not deleting)
                                     await sql.db.prepare('UPDATE tickets SET status = 1, closed = ? WHERE ticket_id = ?').run(timestamp, getTicket["ticket_id"]);
                                     return res.sendStatus(204);
                                 }
                             }
                             default:
                                 return res.sendStatus(404); // This should never happen.
                         }
                     }
                 }
                 break;
             }
             default: // If none of the above are provided.
                 return res.status(404).send("didnt find owo"); // excuse me what
         }
     }
 }
 
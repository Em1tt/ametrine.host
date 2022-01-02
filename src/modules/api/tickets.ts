/**
 * API for the Support Ticket System
 */
import express                 from 'express';
import { auth }                from './auth';
import { permissions }         from '../permissions'
import ticket_categories       from '../../ticket_categories.json';
import { Ticket }              from '../../types/billing/ticket';
import { utils }               from '../utils'
import { cdn }                 from '../cdn'
import crypto                  from 'crypto'
const settings = {
    maxTitle: 100, // Maximum Length for the title of the ticket.
    maxBody: 2000, // Maximum Length for messages.
    maxUploadLimit: 8 // 8 MB limit for files/images.
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
function editContent(content: string, timestamp: string | number | Date, ticket_id: string | number): Promise<unknown> {
    return client.db.hset([`ticket:${ticket_id}`, "content", content, "editedIn", timestamp])
}

function paginate(array: Array<unknown>, page_size: number, page_number: number): Array<unknown> { // https://stackoverflow.com/a/42761393
    // human-readable page numbers usually start with 1, so we reduce 1 in the first argument
    return array.slice((page_number - 1) * page_size, page_number * page_size);
}

let client: any;
export const prop = {
    name: "tickets",
    desc: "Support Ticket System",
    rateLimit: {
        max: 20,
        time: 10 * 1000
    },
    setClient: function(newClient: unknown): void { client = newClient; },
    run: async (req: express.Request, res: express.Response): Promise<any> => {
        async function fileURIs(ticketID: string | number, files: Array<any>, key?: string) {
            let randomKey;
            if (key && key != null) {
                randomKey = key;
            } else {
                randomKey = crypto.randomBytes(32).toString('hex');
            }
            let URIS = []
            if (files.length) {
                URIS = (await Promise.all(files.map(async file => {
                    try {
                        if (!file.name) {
                            //.png - data:image/png;base64,(DATA)
                            file.name = crypto.randomBytes(8).toString("hex") + "." + (file.data.length) ? file.data.slice(5,20).split("/")[1].split(";")[0] : "png"
                        }
                        const extensions = file.name.split(".")
                        const fileName = crypto.createHash('md5').update(extensions.slice(0, extensions.length - 1).join(".") + crypto.randomBytes(4).toString("hex")).digest("hex") + "." + extensions[extensions.length - 1]
                        const cdnResponse = await cdn.upload("screenshots/tickets", `${ticketID}-${fileName}`, file.data, true, randomKey);
                        if (cdnResponse) {
                            const hostURI = (req.get('host') == "ametrine.host") ? "cdn.ametrine.host" : "localhost:3001"
                            return `${req.protocol + '://' + hostURI}/screenshots/tickets/${ticketID}-${fileName}`
                        } else {
                            return null;
                        }
                    } catch (e) {
                        console.error(e)
                        return null;
                    }
                })) as Array<any>).filter(x => x != null);
            }
            return { URIS, randomKey }
        }

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
        function newMsg(msg: Ticket) {
            //msg["content"] = decode_base64(msg["content"]);i
            msg["createdIn"] = new Date(msg["createdIn"]);
            msg["editedIn"] = (msg["editedIn"] == 0) ? null : new Date(msg["editedIn"]);
            return msg;
        }
        async function newTicket(ticket: Ticket) {
            const name = await client.db.hget(`user:${ticket.user_id}`, 'name');
            if (name && name.length) {
                const newTicketProps = { ...ticket};
                newTicketProps["ticket_id"] = parseInt(ticket.ticket_id.toString());
                newTicketProps["user_id"] = parseInt(ticket.user_id.toString());
                newTicketProps["status"] = parseInt(ticket.status.toString());
                newTicketProps["opened"] = parseInt(ticket.opened.toString());
                newTicketProps["closed"] = parseInt(ticket.closed.toString());
                newTicketProps["createdIn"] = parseInt(ticket.createdIn.toString());
                ticket = newTicketProps;
                ticket['name'] = name;
                if (ticket['content'].length > 100) {
                    ticket['content'] = ticket['content'].toString().slice(0, 100);
                }
                ticket["subject"] = utils.decode_base64(ticket["subject"]).toString();
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
                    const { subject, content, categories, priority, files } = req.body;
                    if (!subject || !content) return res.status(406).send("Missing subject or content.");
                    // subject=Hello World&content=Lorem ipsum dolor sit amet, consectetur...&categories=0,1,2
                    if (subject.length > settings.maxTitle) return res.status(403).send(`Subject is too long. Max Length is ${settings.maxTitle}`);
                    if (content.length > settings.maxBody) return res.status(403).send(`Content is too long. Max Length is ${settings.maxBody}`);
                    const category_ids = (categories) ? categories.split(",").map((category: any) => {
                        const findCategory = ticket_categories.find(cate => cate.id == parseInt(category));
                        if (findCategory) {
                            category = parseInt(category); // Converting it to Int in case of any strings at the end.
                            return category;
                        }
                    }) : []
                    if (files.length) {
                        const maxUploadFiles = files.filter(file => {
                            if (!file.data) return true;
                            const buffer = Buffer.from(file.data.split(",")[1]);
                            return Math.floor((buffer.length / 1024) / 1024) > settings.maxUploadLimit
                        })
                        if (maxUploadFiles.length) return res.status(403).send(`Files: ${files.map(file => file.name).join(", ")} are too large! Max file limit is ${settings.maxUploadLimit}MB.`)
                    }
                    return client.incr("ticket_id", async function(err, ticketID: number) {
                        if (err) {
                            console.error(err);
                            return res.status(500).send("Error occured while incrementing ticket ID. Please report this.")
                        }
                        const cdnURIs = await fileURIs(ticketID, files);
                        const ticketData = {
                            ticket_id: ticketID,
                            user_id: userData["user_id"],
                            subject: utils.encode_base64(subject),
                            content: JSON.stringify(content),
                            category_ids: category_ids.join(","),
                            opened: timestamp,
                            priority: (priority) ? priority.toLowerCase() : 'medium',
                            files: (cdnURIs.URIS.length) ? JSON.stringify(cdnURIs.URIS) : '[]'
                        }
                        const getTicket = await client.db.hset([`ticket:${ticketID}`,
                                            "ticket_id", ticketData.ticket_id,
                                            "user_id", ticketData.user_id,
                                            "subject", ticketData.subject,
                                            "content", ticketData.content,
                                            "category_ids", category_ids.join(","),
                                            "status", 0,
                                            "opened", ticketData.opened,
                                            "closed", 0,
                                            "files", ticketData.files,
                                            "level", 3,
                                            "createdIn", ticketData.opened,
                                            "editedIn", 0,
                                            "priority", ticketData.priority,
                                            "key", cdnURIs.randomKey]); // May need to add priority and level in req.body params
                        if (!getTicket) return res.sendStatus(201);
                        return res.status(201).json(ticketData);
                    });
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
                    //const statusQuery = (["opened","closed"].includes(req.query.status)) ? " AND status = ?" : "";   
                    let pageLimit = 10;
                    if (req.query.page) page = parseInt(req.query.page.toString());
                    if (req.query.status == "closed") status = 1;
                    if (req.query.status == "opened") status = 0;
                    if (req.query.limit) pageLimit = parseInt(req.query.limit.toString());
                    if (isNaN(pageLimit)) pageLimit = 10;
                    if (isNaN(page)) page = 1;
                    //const tickets = [];
                    const elements = [userData["user_id"]]
                    if (status != -1) elements.push(status)
                    return client.keys("ticket:*", async function (err, result) {
                        if (err) {
                            console.error(err);
                            return res.status(500).send("Error occured while retrieving keys for tickets. Please report this.")
                        }
                        let tickets: Array<Ticket> = await Promise.all(result.map(async ticketID => {
                            const ticket = await client.db.hgetall(ticketID);
                            return ticket;
                        }))
                        let ticketWhere: (ticket: Ticket) => boolean;
                        if (typeof level == 'object' || req.query.owned) { // fix forbidden bug
                            if (pageLimit > 10) pageLimit = 10; // Users will have access to less pages, just in case.
                            elements.push(pageLimit, (page - 1) * pageLimit);
                            ticketWhere = (ticket: Ticket) => ticket.user_id == userData["user_id"];
                        } else {
                            if (level > 5 || level < 3) return res.sendStatus(403);
                            if (pageLimit > 50) pageLimit = 50; // Making sure server isn't vulnerable to this kind of attack.
                            elements[0] = (level + 1)
                            elements.push(pageLimit, (page - 1) * pageLimit);
                            ticketWhere = (ticket: Ticket) => ticket.level <= level;
                        }
                        tickets = paginate(tickets.filter(ticket => ticketWhere(ticket)).filter(ticket => ["opened","closed"].includes(req.query.status) ? ticket.status == req.query.status : "opened")
                                                      .sort((a,b) => (b.opened as number) - (a.opened as number)), pageLimit, page) as Array<Ticket>; // typescript requires me to declare .opened as number
                        return res.status(200).json(await Promise.all(tickets.map(await newTicket)));
                    })
 
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
                     
                }
                break;
            }
            case ":ticketid": { // Ticket ID
                const ticketID = parseInt(params[0])
                if (params[1]) { // Without api/tickets/:ticketid/:msgid
                    if (allowedMethod(req, res, ["GET", "PATCH", "DELETE"], paramName, userData)) { // copy paste
                        if (ticketID < 0) return res.sendStatus(406);
                        const getTicket: Ticket = await client.db.hgetall(`ticket:${ticketID}`);
                        if (!getTicket) return res.status(404).send("Ticket not found."); // If no tickets are found.
                        if (getTicket.user_id != userData["user_id"] && userData["permission_id"] != `2:${getTicket.level}` && ![3,4].includes(parseInt(userData["permission_id"]))) return res.sendStatus(403);
                        const msgID = parseInt(params[1])
                        if (msgID < 0) return res.sendStatus(406);
                        const getMessage = await client.db.hgetall(`ticket_msg:${ticketID}:${msgID}`);
                        if (!getMessage) return res.status(404).send("Message not found."); // If no message is found.
                        const { content } = req.body;
                        switch (req.method) {
                            case "GET": { // Viewing the contents of a message (Not really sure why you would want to do this but it's there.)
                                return res.status(200).json(newMsg(getMessage));
                            }
                            case "PATCH": { // Editing the message.
                                if (getMessage.user_id != userData["user_id"]) return res.sendStatus(403);
                                const newContent = JSON.stringify(content);
                                await client.db.hset([`ticket_msg:${getTicket["ticket_id"]}:${getMessage["msg_id"]}`, "content", newContent, "editedIn", timestamp])
                                getMessage["content"] = newContent;
                                getMessage["editedIn"] = timestamp;
                                return res.status(200).json(newMsg(getMessage));
                            }
                            case "DELETE": { // Deleting a message
                                return client.del(`ticket_msg:${getTicket["ticket_id"]}:${getMessage["msg_id"]}`, function (err) {
                                    if (err) {
                                        console.error(err);
                                        return res.status(500).send("Error occured while deleting the message. Please report this.")
                                    }
                                    return res.sendStatus(204);
                                })
                            }
                            default:
                                return res.sendStatus(404); // This should never happen.
                        }
                    }
                } else {
                    if (allowedMethod(req, res, ["GET", "POST", "PUT", "DELETE"], paramName, userData)) {
                        if (ticketID < 0) return res.sendStatus(406);
                        const getTicket: Ticket = await client.db.hgetall(`ticket:${ticketID}`);
                        if (!getTicket) return res.status(404).send("Ticket not found."); // If no tickets are found.
                        if (getTicket.user_id != userData["user_id"] && userData["permission_id"] != `2:${getTicket.level}` && ![3,4].includes(parseInt(userData["permission_id"]))) return res.sendStatus(403);
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
                                return client.keys(`ticket_msg:${ticketID}:*`, async function (err, result) {
                                    if (err) {
                                        console.error(err);
                                        return res.status(500).send("Error occured while retrieving keys for messages. Please report this.")
                                    }
                                    let messages: Array<any> = await Promise.all(result.map(async messageID => {
                                        const message = await client.db.hgetall(messageID);
                                        message["msg_id"] = parseInt(message["msg_id"]);
                                        message["ticket_id"] = parseInt(message["ticket_id"]);
                                        message["user_id"] = parseInt(message["user_id"]);
                                        message["createdIn"] = parseInt(message["createdIn"]);
                                        message["editedIn"] = parseInt(message["editedIn"]);
                                        return message;
                                    }))
                                    if (messages.length) { // If there are messages
                                        messages = paginate(messages.sort((a,b) => (b.createdIn) - (a.createdIn)), pageLimit, page);
                                        messages = messages.map(newMsg);
                                        getTicket['msgs'] = messages;
                                    }
                                    return res.status(200).json(await newTicket(getTicket));
                                });
                            }
                            case "POST": { // Sends a new message to that ticket. (Responds with the message content)
                                if (!content) return res.sendStatus(406);
                                if (content.length > settings.maxBody) return res.status(403).send(`Content is too long. Max Length is ${settings.maxBody}`);
                                const { files } = req.body;
                                if (files.length) {
                                    const maxUploadFiles = files.filter(file => {
                                        if (!file.data) return true;
                                        const buffer = Buffer.from(file.data.split(",")[1]);
                                        return Math.floor((buffer.length / 1024) / 1024) > settings.maxUploadLimit
                                    })
                                    if (maxUploadFiles.length) return res.status(403).send(`Files: ${files.map(file => file.name).join(", ")} are too large! Max file limit is ${settings.maxUploadLimit}MB.`)
                                }
                                return client.incr("ticket_msg_id", async function(err, messageID: number) {
                                    if (err) {
                                        console.error(err);
                                        return res.status(500).send("Error occured while incrementing ticket ID. Please report this.")
                                    }
                                    let key = null;
                                    if (getTicket.key) {
                                        key = getTicket.key
                                    }
                                    const cdnURIs = await fileURIs(ticketID + "-" + messageID, files, key);
                                    if (key == null) {
                                        await client.db.hset([`ticket:${ticketID}`, "key", cdnURIs.randomKey]);
                                    }
                                    const msgData = {
                                        msg_id: messageID,
                                        ticket_id: getTicket["ticket_id"],
                                        user_id: userData["user_id"],
                                        content: JSON.stringify(content),
                                        opened: timestamp,
                                        files: (cdnURIs.URIS.length) ? JSON.stringify(cdnURIs.URIS) : '[]'
                                    }
                                    const getMsg = await client.db.hset([`ticket_msg:${ticketID}:${messageID}`,
                                                        "msg_id", msgData.msg_id,
                                                        "ticket_id", msgData.ticket_id,
                                                        "user_id", msgData.user_id,
                                                        "content", msgData.content,
                                                        "files", msgData.files,
                                                        "createdIn", timestamp,
                                                        "editedIn", 0]);
                                    if (!getMsg) return res.sendStatus(201);
                                    return res.status(201).json(msgData);
                                });
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
                                    await client.db.hset([`ticket:${getTicket["ticket_id"]}`, "status", 1, "closed", timestamp])
                                    updated = true;
                                }
                                if (reopen && reopen == "1") { // If reopen is provided, Open the ticket again.
                                    if (getTicket["closed"] == 0) return res.sendStatus(406);
                                    await client.db.hset([`ticket:${getTicket["ticket_id"]}`, "status", 0, "opened", timestamp, "closed", 0])
                                    updated = true;
                                }
                                //if (getTicket["closed"] != 0) return res.sendStatus(406); // If ticket is closed
                                if (getTicket["user_id"] != userData["user_id"]) return res.sendStatus(403); // No Staff is allowed to change the users title and content.
                                if (subject && subject.length) {
                                    await client.db.hset([`ticket:${getTicket["ticket_id"]}`, "subject", utils.encode_base64(subject), "editedIn", timestamp])
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
                                    await client.db.hset([`ticket:${getTicket["ticket_id"]}`, "category_ids", category_ids.join(",")])
                                    updated = true;
                                }
                                if (priority && priority !== null){
                                    await client.db.hset([`ticket:${getTicket["ticket_id"]}`, "priority", priority])
                                    updated = true;
                                }
                                return (updated) ? res.sendStatus(204) : res.sendStatus(406)
                            }
                            case "DELETE": { // Closes the Ticket.
                                if (permissions.hasPermission(userData['permission_id'], `/tickets/:ticketid/delete`) && req.body.force) { // Force delete a message. (Used for spam tickets)
                                    return client.del(`ticket:${getTicket["ticket_id"]}`, async function (err0) {
                                        if (req.body.msgs) {
                                            return client.keys(`ticket_msg:${ticketID}:*`, function (err, result) {
                                                if (err) {
                                                    console.error(err);
                                                    return res.status(500).send("Error occured while retrieving keys for messages. Please report this.")
                                                }
                                                result.map(msgID => {
                                                    return client.del(`ticket_msg:${getTicket["ticket_id"]}:${msgID}`, function (err2) {
                                                        if (err2) {
                                                            console.error(err);
                                                        }
                                                    })
                                                })
                                                return res.sendStatus(204);
                                                
                                            })
                                        }
                                        return res.sendStatus(204);
                                    })
                                } else { // Closing a ticket. (Not deleting)
                                    await client.db.hset([`ticket:${getTicket["ticket_id"]}`, "status", 1, "closed", timestamp])
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
  
 

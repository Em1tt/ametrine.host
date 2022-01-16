/**
 * API for managing knowledgebase
 */
 import express                 from 'express';
 import { auth }                from './auth';
 import { permissions }         from '../permissions'
 import knowledgebase_categories       from '../../knowledgebase_categories.json';
 import { Article }              from '../../types/billing/knowledgebase';
 import { utils }               from '../utils'
 import { cdn }                 from '../cdn'
 import crypto                  from 'crypto'
 const settings = {
     maxTitle: 100, // Maximum Length for the title of the knowledgebase article.
     maxBody: 2000, // Maximum Length for knowledgebasse article.
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
     if (!permissions.hasPermission(userData['permission_id'], `/knowledgebase/${paramName}`)) {
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
 function editContent(content: string, timestamp: string | number | Date, article_id: string | number): Promise<unknown> {
     return client.db.hset([`knowledgebase:${article_id}`, "content", content, "editedIn", timestamp])
 }
 
 function paginate(array: Array<unknown>, page_size: number, page_number: number): Array<unknown> { // https://stackoverflow.com/a/42761393
     // human-readable page numbers usually start with 1, so we reduce 1 in the first argument
     return array.slice((page_number - 1) * page_size, page_number * page_size);
 }
 
 let client: any;
 export const prop = {
     name: "knowledgebase",
     desc: "Support Knowledgebase System",
     rateLimit: {
         max: 20,
         time: 10 * 1000
     },
     setClient: function(newClient: unknown): void { client = newClient; },
     run: async (req: express.Request, res: express.Response): Promise<any> => {
         async function fileURIs(articleID: string | number, files: Array<any>, key?: string) {
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
                         const cdnResponse = await cdn.upload("screenshots/knowledgebase", `${articleID}-${fileName}`, file.data, true, randomKey);
                         if (cdnResponse) {
                             const hostURI = (req.get('host') == "ametrine.host") ? "cdn.ametrine.host" : "localhost:3001"
                             return `${req.protocol + '://' + hostURI}/screenshots/knowledgebase/${articleID}-${fileName}`
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
             paramName = ":articleid";
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
         async function newArticle(article: Article) {
             const name = await client.db.hget(`user:${article.user_id}`, 'name');
             if (name && name.length) {
                 const newArticleProps = { ...article};
                 newArticleProps["article_id"] = parseInt(article.article_id.toString());
                 newArticleProps["user_id"] = parseInt(article.user_id.toString());
                 newArticleProps["status"] = parseInt(article.status.toString());
                 newArticleProps["likes"] = parseInt(article.likes.toString());
                 newArticleProps["dislikes"] = parseInt(article.dislikes.toString());
                 newArticleProps["createdIn"] = parseInt(article.createdIn.toString());
                 article = newArticleProps;
                 article['name'] = name;
                 if (article['content'].length > 100) {
                     article['content'] = article['content'].toString().slice(0, 100);
                 }
                 article["header"] = utils.decode_base64(article["header"]).toString();
                 //ticket["content"] = decode_base64(ticket["content"]);
                 article["editedIn"] = (article["editedIn"] == 0) ? null : new Date(article["editedIn"]);
                 article["closed"] = (article["closed"] == 0) ? null : new Date(article["closed"]);
                 return article;
             }
             return null;
         }
         switch (paramName) {
             case "create": {// Creates the article.
                 if (allowedMethod(req, res, ["POST"], paramName, userData)) {
                     const { header, content, categories, files } = req.body;
                     if (!header || !content) return res.status(406).send("Missing header or content.");
                     // subject=Hello World&content=Lorem ipsum dolor sit amet, consectetur...&categories=0,1,2
                     if (header.length > settings.maxTitle) return res.status(403).send(`Header is too long. Max Length is ${settings.maxTitle}`);
                     if (content.length > settings.maxBody) return res.status(403).send(`Content is too long. Max Length is ${settings.maxBody}`);
                     const category_ids = (categories) ? categories.split(",").map((category: any) => {
                         const findCategory = knowledgebase_categories.find(cate => cate.id == parseInt(category));
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
                     return client.incr("article_id", async function(err, articleID: number) {
                         if (err) {
                             console.error(err);
                             return res.status(500).send("Error occured while incrementing article ID. Please report this.")
                         }
                         const cdnURIs = await fileURIs(articleID, files);
                         const articleData = {
                             article_id: articleID,
                             user_id: userData["user_id"],
                             header: utils.encode_base64(header),
                             content: JSON.stringify(content),
                             category_ids: category_ids.join(","),
                             files: (cdnURIs.URIS.length) ? JSON.stringify(cdnURIs.URIS) : '[]'
                         }
                         const getArticle = await client.db.hset([`article:${articleID}`,
                                             "article_id", articleData.article_id,
                                             "user_id", articleData.user_id,
                                             "header", articleData.header,
                                             "content", articleData.content,
                                             "category_ids", category_ids.join(","),
                                             "status", 0,
                                             "files", articleData.files,
                                             "level", 3,
                                             "createdIn", timestamp,
                                             "editedIn", 0,
                                             "key", cdnURIs.randomKey]); // May need to add priority and level in req.body params
                         if (!getArticle) return res.sendStatus(201);
                         return res.status(201).json(articleData);
                     });
                 }
                 break;
             }
             case "categories": { // Categories
                 res.set("Allow", "GET");
                 if (req.method != "GET") return res.sendStatus(405);
                 return res.status(200).json(knowledgebase_categories);
             }
             case "list": { // Lists the articles
                 if (allowedMethod(req, res, ["GET"], paramName, userData)) {
                     if(!req.query.category) return res.sendStatus(406);
                     if(!knowledgebase_categories.find(k => k.name.toLowerCase() == req.query.category.toLowerCase())) return res.sendStatus(406);
                     let page = 1;
                     let status = -1;
                     //const statusQuery = (["opened","closed"].includes(req.query.status)) ? " AND status = ?" : "";   
                     let pageLimit = 20;
                     if (req.query.page) page = parseInt(req.query.page.toString());
                     if ([0,1].includes(parseInt(req.query.status))) status = parseInt(req.query.status);
                     if (req.query.limit) pageLimit = parseInt(req.query.limit.toString());
                     if (isNaN(pageLimit)) pageLimit = 10;
                     if (isNaN(page)) page = 1;
                     //const articles = [];
                     const elements = [userData["user_id"]]
                     if (status != -1) elements.push(status)
                     return client.keys("article:*", async function (err, result) {
                         if (err) {
                             console.error(err);
                             return res.status(500).send("Error occured while retrieving keys for articles. Please report this.")
                         }
                         let articles: Array<Article> = await Promise.all(result.map(async articleID => {
                             const article = await client.db.hgetall(articleID);
                             return article;
                         }))
                         let articleWhere: (article: Article) => boolean;
                         if (typeof level == 'object' || req.query.owned) { // fix forbidden bug
                             if (pageLimit > 10) pageLimit = 10; // Users will have access to less pages, just in case.
                             elements.push(pageLimit, (page - 1) * pageLimit);
                             articleWhere = (article: Article) => article.user_id == userData["user_id"];
                         } else {
                             if (level > 5 || level < 3) return res.sendStatus(403);
                             if (pageLimit > 50) pageLimit = 50; // Making sure server isn't vulnerable to this kind of attack.
                             elements[0] = (level + 1)
                             elements.push(pageLimit, (page - 1) * pageLimit);
                             articleWhere = (article: Article) => article.level <= level;
                         }
                         articles = paginate(articles.filter(article => articleWhere(article)).filter(article => [0,1].includes(parseInt(req.query.status)) ? article.status == parseInt(req.query.status) : article)
                                                        .filter(article => article.category_ids == req.query.category)
                                                       .sort((a,b) => (b.header as any) - (a.header as any)), pageLimit, page) as Array<Article>; // typescript requires me to declare .opened as number
                         return res.status(200).json(await Promise.all(articles.map(await newArticle)));
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
             case ":articleid": { // article ID
                 const articleID = parseInt(params[0])
                     if (allowedMethod(req, res, ["GET", "POST", "PUT", "DELETE"], paramName, userData)) {
                         if (articleID < 0) return res.sendStatus(406);
                         const getArticle: Article = await client.db.hgetall(`article:${articleID}`);
                         if (!getArticle) return res.status(404).send("Article not found."); // If no articles are found.
                         if (!getArticle.status && userData["permission_id"] != `2:${getArticle.level}` && ![3,4].includes(parseInt(userData["permission_id"]))) return res.sendStatus(403);
                         const { like, dislike } = req.body;
                         // Using {} at switch cases because ESLint is complaining
                         switch (req.method) {
                             case "GET": { // Viewing the article Conversation.
                                 return client.keys(`article:${articleID}:*`, async function (err, result) {
                                     if (err) {
                                         console.error(err);
                                         return res.status(500).send("Error occured while retrieving keys for messages. Please report this.")
                                     }
                                     let article: Array<any> = await Promise.all(result.map(async articles => {
                                         const ratings = await client.db.hgetall(articles);
                                         ratings["likes"] = parseInt(articles["msg_id"]);
                                         ratings["dislikes"] = parseInt(articles["ticket_id"]);
                                         return ratings;
                                     }))
                                     if (article.length) { // If there are messages
                                         article = paginate(article, 1000000, 1);
                                         getArticle['ratings'] = article;
                                     }
                                     return res.status(200).json(await newArticle(getArticle));
                                 });
                             }
                             case "POST": { // Sends a new rating to that article. (Responds with the new ratings)
                                 if (!like && !dislike) return res.sendStatus(406);

                                 return res.sendStatus(501);
                                 //!Please finish
                                
                             } break;
                             case "PUT": { // Updates the article (Edit content, header, status, etc.)

                                return res.sendStatus(501);
                                //!Please finish

                                 const { subject, categories, priority, content, status } = req.body;
                                 let updated = false;
                                 /**
                                   * closed (closed=1) - Close the ticket
                                   * subject (subject=Hello World) - Subject of the Ticket (title)
                                   * content (content=Lorem ipsum dolor...) - Content of the Ticket.
                                   * categories (categories=0,1) - Categories for the ticket.
                                   * reopen (reopen=1) - Reopens the ticket
                                   */
                                 if(parseInt(status) || parseInt(status) === 0){
                                     if(![0,1,2,3].includes(parseInt(status))) return res.sendStatus(406);
                                     await client.db.hset([`ticket:${getTicket["ticket_id"]}`, "status", parseInt(status)])
                                     updated = true;
                                 }
                                 //if (getTicket["closed"] != 0) return res.sendStatus(406); // If ticket is closed
                                 if (getTicket["user_id"] != userData["user_id"] && userData["permission_id"] != 4 && (subject?.length || categories?.length || content)) return res.sendStatus(403); // No Staff is allowed to change the users title and content.
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
                             case "DELETE": { // Removes the article
                                //!Staff with a certain permisssion only
                                //!Please finish
                                return res.sendStatus(501);
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
                   break;
               }
             default: // If none of the above are provided.
                 return res.status(404).send("didnt find owo"); // excuse me what
         }
     }
 }
   
  
 
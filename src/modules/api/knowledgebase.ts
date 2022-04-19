/**
 * API for managing knowledgebase
 */
import express                  from 'express';
import { auth }                 from './auth';
import { permissions }          from '../permissions'
import knowledgebase_categories from '../../knowledgebase_categories.json';
import { Article }              from '../../types/billing/knowledgebase';
import { UserData }             from '../../types/billing/user';
import { Redis }                from '../../types/redis';

import { utils }                from '../utils'
import { cdn }                  from '../cdn'
import crypto                   from 'crypto'
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
function allowedMethod(req: express.Request, res: express.Response, type: Array<string>, paramName: string, userData: UserData): boolean {
    if (!permissions.hasPermission(userData['permission_id'], `/knowledgebase/${paramName}`) && !permissions.hasPermission(userData['permission_id'], `/staff/knowledgebase/${paramName}`)) {
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
    return client.db.hset([`article:${article_id}`, "content", content, "editedIn", timestamp])
}

function paginate(array: Array<unknown>, page_size: number, page_number: number): Array<unknown> { // https://stackoverflow.com/a/42761393
    // human-readable page numbers usually start with 1, so we reduce 1 in the first argument
    return array.slice((page_number - 1) * page_size, page_number * page_size);
}

let client: Redis;
export const prop = {
    name: "knowledgebase",
    desc: "Support Knowledgebase System",
    rateLimit: {
        max: 20,
        time: 3 * 1000
    },
    setClient: function(newClient: Redis): void { client = newClient; },
    run: async (req: express.Request, res: express.Response): Promise<any> => {
        async function fileURIs(articleID: string | number, files: Array<any>) {
            let URIS = []
            if (files && files.length) {
                URIS = (await Promise.all(files.map(async file => {
                    try {
                        if (!file.name) {
                            //.png - data:image/png;base64,(DATA)
                            file.name = crypto.randomBytes(8).toString("hex") + "." + (file.data.length) ? file.data.slice(5,20).split("/")[1].split(";")[0] : "png"
                        }
                        const extensions = file.name.split(".")
                        const fileName = crypto.createHash('md5').update(extensions.slice(0, extensions.length - 1).join(".") + crypto.randomBytes(4).toString("hex")).digest("hex") + "." + extensions[extensions.length - 1]
                        const cdnResponse = await cdn.upload("screenshots/knowledgebase", `${articleID}-${fileName}`, file.data, false);
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
            return { URIS }
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
        async function newArticle(article: Article) {
            const name = await client.db.hget(`user:${article.user_id}`, 'name') as string;
            if (name && name.length) {
                const newArticleProps = { ...article};
                newArticleProps["article_id"] = parseInt(article.article_id.toString());
                newArticleProps["user_id"] = parseInt(article.user_id.toString());
                newArticleProps["state"] = parseInt(article.state.toString());
                newArticleProps["likes"] = parseInt(article.likes.toString());
                newArticleProps["dislikes"] = parseInt(article.dislikes.toString());
                newArticleProps["createdIn"] = parseInt(article.createdIn.toString());
                newArticleProps["permission_id"] = parseInt(article.permission_id.toString());
                
                article = newArticleProps;
                article['name'] = name;
                /*
                if (article['content'].length > 100) {
                    article['content'] = article['content'].toString().slice(0, 100);
                }*/
                article["header"] = utils.decode_base64(article["header"]).toString();
                //ticket["content"] = decode_base64(ticket["content"]);
                article["editedIn"] = (article["editedIn"] == 0) ? null : new Date(article["editedIn"]);
                article["closed"] = (article["closed"] == 0) ? null : new Date(article["closed"]);
                return article;
            }
            return null;
        }
        switch (paramName) {
            case "create": { // Creates the article.
                if (allowedMethod(req, res, ["POST"], paramName, userData)) {
                    const { header, content, categories, files, video } = req.body;
                    let { tags } = req.body;
                    // Tags must be in commas, so for example: "billing,vps,article"
                    if (tags && tags.length) {
                        tags = tags.split(",")
                    }
                    if (!tags || !tags.length) tags = [];

                    //if (!header || !content) return res.status(406).send("Missing header or content."); NOT REQUIRED. IS CHECKED INSIDE PATCH
                    // subject=Hello World&content=Lorem ipsum dolor sit amet, consectetur...&categories=0,1,2
                    if (header?.length > settings.maxTitle) return res.status(403).send(`Header is too long. Max Length is ${settings.maxTitle}`);
                    if (content?.length > settings.maxBody) return res.status(403).send(`Content is too long. Max Length is ${settings.maxBody}`);
                    const category_ids = (categories) ? categories.split(",").map((category: any) => {
                        const findCategory = knowledgebase_categories.find(cate => cate.id == parseInt(category));
                        if (findCategory) {
                            category = parseInt(category); // Converting it to Int in case of any strings at the end.
                            return category;
                        }
                    }) : []
                    if (files && files.length) {
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
                            header: header ? utils.encode_base64(header) : "",
                            content: content ? JSON.stringify(content) : "",
                            category_ids: category_ids.join(","),
                            files: (cdnURIs.URIS.length) ? JSON.stringify(cdnURIs.URIS) : '[]',
                            tags: tags,
                            video: video
                        }

                        /*
    readonly article_id   : number;
    readonly user_id      : number;
    readonly permission_id: number;
    header                : string;
    content               : string;
    readonly state        : string | number;
    readonly category_ids : string;
    likes                 : number;
    dislikes              : number;
    files                 : Array<string> | number;
    createdIn             : number | Date;
    editedIn              : number | Date;
                        */
                        const getArticle = await client.db.hset([`article:${articleID}`,
                                            "article_id", articleData.article_id,
                                            "user_id", articleData.user_id,
                                            "permission_id", userData["permission_id"],
                                            "header", articleData.header,
                                            "content", articleData.content,
                                            "state", 0,
                                            "category_ids", category_ids.join(","),
                                            "tags", tags.join(","),
                                            "likes", '[]',
                                            "dislikes", '[]',
                                            "files", articleData.files,
                                            "createdIn", timestamp,
                                            "editedIn", 0]); // May need to add priority and level in req.body params
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
            case "tags": { // All available tags
                res.set("Allow", "GET");
                if (req.method != "GET") return res.sendStatus(405);
                return client.keys("article:*", async function (err, result) {
                    if (err) {
                        console.error(err);
                        return res.status(500).send("Error occured while retrieving keys for articles. Please report this.")
                    }
                    const articles: Array<Article> = await Promise.all(result.map(async articleID => {
                        const article = await client.db.hgetall(articleID);
                        return article;
                    }))
                    const tags = [];
                    articles.filter(article => article.state == 1)
                        .filter(article => (req.query.category) ? article.category_ids == req.query.category : true)
                        .map(article => {
                        if (article.tags.toString() != "") {
                            const splitTag = (article.tags.toString()).split(",");
                            if (splitTag[0] != "") {
                                splitTag.forEach(tag => tags.push(tag));
                            }
                        }
                    })
                    return res.status(200).json([...new Set(tags)]); //Set to remove duplicate values.
                })
            }
            case "list": { // Lists the articles
                res.set("Allow", "GET");
                if (req.method != "GET") return res.sendStatus(405);
                //if(!req.query.category) return res.sendStatus(406);
                //if(!knowledgebase_categories.find(k => k.id == req.query.category.toLowerCase())) return res.sendStatus(406); // commenting for now
                let page = 1;
                //const statusQuery = (["opened","closed"].includes(req.query.status)) ? " AND status = ?" : "";   
                let pageLimit = 20;
                let state = 1;
                let tags = [];
                if ([0,1,2].includes(parseInt(req.query.state))) state = parseInt(req?.query?.state?.toString());
                if (req.query.page) page = parseInt(req.query.page.toString());
                if (req.query.limit) pageLimit = parseInt(req.query.limit.toString());
                if (isNaN(pageLimit)) pageLimit = 10;
                if (isNaN(page)) page = 1;
                if (isNaN(state)) state = 1;
                if (req.query.tags) {
                    // prevent server from erroring if not json
                    try {
                        tags = JSON.parse(req.query.tags);
                    } catch (e) {
                        tags = [];
                    }
                }
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
                    switch (state) {
                        case 0: // Not finished (staffs perm id who created it and above)
                            if (pageLimit > 50) pageLimit = 50;
                            articleWhere = (article: Article) => article.state == state && (article.user_id == userData["user_id"] || article.permission_id >= parseInt(userData["permission_id"]));
                            break;
                        case 1: // Finished (public)
                            if (pageLimit > 20) pageLimit = 20; // Users will have access to less pages, just in case.
                            articleWhere = (article: Article) => article.state == state
                            break;
                        case 2: // Staff (any staff can see as long as they have the correct permissions)
                            if (pageLimit > 50) pageLimit = 50;
                            articleWhere = (article: Article) => article.state == state && permissions.hasPermission(userData['permission_id'], `/staff/knowledgebase/:articleid`);
                            break;
                    }
                    articles = paginate(articles.filter(article => articleWhere(article)).filter(article => (req.query.category) ? article.category_ids == req.query.category : true)
                                                .filter(article => (tags?.length) ? tags.every(a => article.tags.includes(a)) : true)
                                                .sort((a,b) => (b.createdIn as number) - (a.createdIn as number)), pageLimit, page) as Array<Article>; // typescript requires me to declare .opened as number
                    return res.status(200).json(await Promise.all(articles.map(await newArticle)));
                })
            }
            case "count": { // Shows the count of all public articles
                res.set("Allow", "GET");
                if (req.method != "GET") return res.sendStatus(405);
                let tags = [];
                try {
                    tags = JSON.parse(req.query.tags);
                } catch (e) {
                    tags = [];
                }
                let state = 1;
                if ([0,1,2].includes(parseInt(req.query.state))) state = parseInt(req?.query?.state?.toString());
                if (isNaN(state)) state = 1;
                return client.keys("article:*", async function (err, result) {
                    if (err) {
                        console.error(err);
                        return res.status(500).send("Error occured while retrieving keys for articles. Please report this.")
                    }
                    let articles: Array<Article> = await Promise.all(result.map(async articleID => {
                        const article = await client.db.hgetall(articleID);
                        return article;
                    }))
                    articles = articles.filter(article => article.state == state)
                        .filter(article => (req.query.category) ? article.category_ids == req.query.category : true)
                        .filter(article => (tags?.length) ? tags.every(a => article.tags.includes(a)) : true)
                    return res.status(200).send(articles.length.toString());
                })
            }
            case ":articleid": { // article ID
                const articleID = parseInt(params[0])
                if (allowedMethod(req, res, ["GET", "POST", "PUT", "DELETE"], paramName, userData)) { // going to fix permissions later to allow other users besides staff to send ratings
                    if (articleID < 0) return res.sendStatus(406);
                    const getArticle: Article = await client.db.hgetall(`article:${articleID}`);
                    if (!getArticle) return res.status(404).send("Article not found."); // If no articles are found.
                    if (getArticle.state == 2 && !permissions.hasPermission(userData['permission_id'], `/staff/knowledgebase/:articleid`)) return res.sendStatus(403);
                    if (getArticle.state == 0 && (!permissions.hasPermission(userData['permission_id'], `/staff/knowledgebase/all`) || getArticle.user_id != userData["user_id"])) return res.sendStatus(403);
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
                                    ratings["likes"] = parseInt(articles["likes"]);
                                    ratings["dislikes"] = parseInt(articles["dislikes"]);
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
                            if (getArticle.state != 1) return res.status(406).send("You can't send ratings to unpublished articles.");
                            if (!like && !dislike) return res.sendStatus(406);
                            try {
                                let likes = getArticle.likes.toString();
                                let dislikes = getArticle.dislikes.toString();
                                if (likes == '0') likes = '[]'
                                if (dislikes == '0') dislikes = '[]'
                                
                            const likeArray: Array<number> = JSON.parse(likes); // typescript requires me to do .toString() else itll error
                                const dislikeArray: Array<number> = JSON.parse(dislikes);
                                if (like && likeArray.includes(userData["user_id"])) return res.status(403).send("You've already liked this article!");
                                if (dislike && dislikeArray.includes(userData["user_id"])) return res.status(403).send("You've already disliked this article!");
                                if (like) { // if the user likes
                                    likeArray.push(userData["user_id"]);
                                    if (dislikeArray.includes(userData["user_id"])) dislikeArray.splice(dislikeArray.indexOf(userData["userData"]), 1)
                                } else if (dislike) { // if the user dislikes
                                    dislikeArray.push(userData["user_id"]);
                                    if (likeArray.includes(userData["user_id"])) likeArray.splice(likeArray.indexOf(userData["userData"]), 1)
                                }
                                await client.db.hset([`article:${getArticle["article_id"]}`, "likes", JSON.stringify(likeArray), "dislikes", JSON.stringify(dislikeArray)])

                                    return res.sendStatus(200);
                                } catch (e) {
                                    console.error(e);
                                    return res.sendStatus(500).send("Error occured. Please report this.");
                                }

                                
                            }
                            case "PUT": { // Updates the article (Edit content, header, status, etc.)
                                const { header, content, categories, state, video} = req.body;
                                let { tags } = req.body;
                                let updated = false;
                                if (getArticle["user_id"] != getArticle["user_id"] && userData["permission_id"] != 4 &&
                                    ((getArticle.state == 0 && parseInt(userData['permission_id']) < getArticle.permission_id) ||
                                    (getArticle.state == 2 && !permissions.hasPermission(userData['permission_id'], `/staff/knowledgebase/:articleid`)) ||
                                    getArticle.state == 1)) return res.sendStatus(403);
                                if (parseInt(state) || parseInt(state) == 0) {
                                    if(![0,1,2].includes(parseInt(state))) return res.sendStatus(406);
                                    if([1,2].includes(parseInt(state)) && ((header || content || categories || tags) || ((!getArticle.header || getArticle.header == '') || (!getArticle.content || getArticle.content == '') ||
                                    (!getArticle.category_ids || getArticle.category_ids == '') || (!getArticle.tags || getArticle.tags.split(",").length < 2)))) return res.status(406)
                                    .send(`Cannot publish article with missing information. Required: Header, Content, Category, At least 2 tags. Add these in a separate request.`);
                                    await client.db.hset([`article:${getArticle["article_id"]}`, "state", parseInt(state)])
                                    updated = true;
                                }
                                if(video && video.length) {
                                    await client.db.hset([`article:${getArticle["article_id"]}`, "video", video])
                                }
                                if (header && header.length > settings.maxTitle) return res.status(403).send(`Header is too long. Max Length is ${settings.maxTitle}`);
                                if (content && content.length > settings.maxBody) return res.status(403).send(`Content is too long. Max Length is ${settings.maxBody}`);
                                if (categories && categories.length) {
                                    let category_ids = []
                                    if (typeof categories == "string") {
                                        category_ids = (categories) ? categories.split(",").map(category => { // TS is telling me that number cant be converted to string when parseInt on this, but it works on the else statement
                                            const findCategory = knowledgebase_categories.find(cate => cate.id == category);
                                            if (findCategory) {
                                                //category = parseInt(category); // Converting it to Int in case of any strings at the end.
                                                return category;
                                            }
                                        }) : []
                                    } else {
                                        category_ids = categories.map(category => {
                                            const findCategory = knowledgebase_categories.find(cate => cate.id == parseInt(category));
                                            if (findCategory) {
                                                category = parseInt(category); // Converting it to Int in case of any strings at the end.
                                                return category;
                                            }
                                        })
                                    }
                                    if (!category_ids.length) return res.sendStatus(406);
                                    await client.db.hset([`article:${getArticle["article_id"]}`, "category_ids", category_ids.join(",")])
                                    updated = true;
                                }
                                if (header && header.length) {
                                    await client.db.hset([`article:${getArticle["article_id"]}`, "header", utils.encode_base64(header), "editedIn", timestamp])
                                    updated = true;
                                }
                                if (content) {
                                    editContent(JSON.stringify(content), timestamp, getArticle["article_id"]);
                                    updated = true;
                                }
                                if(tags && tags.length){
                                    tags = tags.split(",");
                                    if (!tags || !tags.length) tags = [];
                                    tags = tags.join(",");
                                    await client.db.hset([`article:${getArticle["article_id"]}`, "tags", tags])
                                    updated = true;
                                }
                                return (updated) ? res.sendStatus(204) : res.sendStatus(406)
                             }
                             case "DELETE": { // Removes the article
                                if (getArticle["user_id"] != getArticle["user_id"] && userData["permission_id"] != 4 &&
                                    ((getArticle.state == 0 && parseInt(userData['permission_id']) < getArticle.permission_id) ||
                                    (getArticle.state == 2 && !permissions.hasPermission(userData['permission_id'], `/staff/knowledgebase/:articleid`)) ||
                                    getArticle.state == 1)) return res.sendStatus(403);
                                    return client.del(`article:${getArticle["article_id"]}`, async function (err) {
                                        if (err) {
                                            console.error(err);
                                            return res.status(500).send("Error occured while deleting the article. Please report this.")
                                        }
                                        return res.sendStatus(204);
                                    })
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
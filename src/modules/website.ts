// imports
import dotenv from "dotenv"
import express from "express";
import morgan from "morgan";
import path from "path";
import fs from "fs";
import * as eta from "eta";
import config from "../config.json";
import { Endpoint } from "../types/endpoint";
import helmet from "helmet"
import cookieParser from "cookie-parser"
import { auth } from "./api/auth"
import * as plans from "../plans.json"
import { Ticket } from "../types/billing/ticket";
import { UserData } from "../types/billing/user";
import { permissions } from "./permissions";
import permIDs from "../permissions.json";
import article_categories from "../knowledgebase_categories.json";
import rateLimit from "express-rate-limit";
import { cdn } from "./cdn"
import redis from 'redis';
import ms from 'ms';
import nonce from 'nonce-express';
import { Article } from "src/types/billing/knowledgebase";

dotenv.config({ path: __dirname + "/../../.env" });

const redisClient: redis.Client = redis.createClient({ password: process.env.REDIS_PASSWORD, user: "default" });
redisClient.on("connect", function () {
  console.log("[Redis] Connected to Database.")
  redisClient.db = { // Functions to make redis more easier to use than having a bunch of callback functions.
    get: function (key: string): Promise<string | number | null> {
      return new Promise((resolve, reject) => {
        redisClient.get(key, function (err, res) {
          if (err) return reject(err);
          resolve(res);
        })
      })
    },
    hget: function (key: string, field: string | number): Promise<string | number | null> {
      return new Promise((resolve, reject) => {
        redisClient.hget(key, field, function (err, res) {
          if (err) return reject(err);
          resolve(res);
        })
      })
    },
    hmget: function (key: string, fields: Array<string | number>): Promise<string | number | null> {
      return new Promise((resolve, reject) => {
        redisClient.hmget(key, fields, function (err, res) {
          if (err) return reject(err);
          resolve(res);
        })
      })
    },
    incr: function (key: string): Promise<number | null> {
      return new Promise((resolve, reject) => {
        redisClient.incr(key, function (err, res) {
          if (err) return reject(err);
          resolve(res);
        })
      })
    },
    hgetall: function (key: string): Promise<any> {
      return new Promise((resolve, reject) => {
        redisClient.hgetall(key, function (err, res) {
          if (err) return reject(err);
          resolve(res);
        })
      })
    },
    hexists: function (key: string, field: string): Promise<number | boolean> {
      return new Promise((resolve, reject) => {
        redisClient.hexists(key, field, function (err, res) {
          if (err) return reject(err);
          resolve(res);
        })
      })
    },
    exists: function (key: string): Promise<number | boolean> {
      return new Promise((resolve, reject) => {
        redisClient.exists(key, function (err, res) {
          if (err) return reject(err);
          resolve(res);
        })
      })
    },
    hset: function (values: Array<string | number>): Promise<any> {
      return new Promise((resolve, reject) => {
        redisClient.hset(values, function (err, res) {
          if (err) return reject(err);
          resolve(res);
        })
      })
    }

  }
});

redisClient.JWToptions = {
  RTOptions: { // Refresh Token Options
    expiresIn: ms('7 days'),
    issuer: "Ametrine Host (1.0)"
  },
  ATOptions: { // Access Token Options
    expiresIn: ms('1h'),
    issuer: "Ametrine Host (1.0)"
  },
  RTOptionsRemember: {
    expiresIn: ms('90 days'),
    issuer: "Ametrine Host (1.0)"
  }
};

redisClient.on("error", function (error) {
  console.log("[Redis] ERROR" + "\n" + error)
});

const app: express.Application = express();
const html: string = path.join(__dirname, "views", "html");
const billing: string = path.join(__dirname, "views", "billing", "html");

const endpoints: Map<string, Endpoint> = new Map();
const files: Array<string> = fs.readdirSync(`./modules/api`)
  .filter((f) => f.endsWith(".js"));

for (const f of files) {
  const ep: Endpoint = require(`./api/${f.replace(".js", "")}`);
  endpoints.set(ep.prop.name, ep);
  if (ep.prop["rateLimit"]) {
    app.use("/api/" + ep.prop.name + "*", rateLimit({
      windowMs: ep.prop["rateLimit"].time,
      max: ep.prop["rateLimit"].max,
      message: "You are sending too many API requests! Please try again later.",
    }));
    // There could be another solution for doing this.
  }
  if (ep.prop["setClient"]) { // Set redis without having to require redis in all API endpoints
    ep.prop["setClient"](redisClient);
  }
}
console.log(`${endpoints.size} api endpoints loaded`);

app.use(cookieParser());

// 30 requests every 40 seconds
const apiLimiter = rateLimit({
  windowMs: 40 * 1000, // 40 seconds
  max: 30,
  message: "You are sending too many API requests! Please try again later."
});

app.use(morgan("[express]\t:method :url :status :res[content-length] - :response-time ms"));

// serve static files
app.use(express.static(path.join(__dirname, "views")));

// Create Parse for application/x-www-form-urlencoded
app.use(express.urlencoded({ limit: config.website.uploadLimit.urlencoded, extended: false })) // Required for req.body
app.use('/api/order/webhook', express.raw({ type: 'application/json' }));
// Create Parse for application/json
app.use(express.json({ limit: config.website.uploadLimit.json }));

// eta
app.engine("eta", eta.renderFile);
app.set("view engine", "eta");

app.use(nonce());

//Fetch userdata && permission checking middleware
app.use(async (r: express.Request, s: express.Response, next: express.NextFunction) => {
  const userData = await auth.getUserData(r, s);
  const path = r.url.slice(1).split("?")[0].split("/");
  path.shift();
  path.length ? s.locals.userData = userData : 0;
  if (!isNaN(parseInt(path.at(-1)))) {
    path.pop();
    path.push(":id");
  }
  s.locals.config = config.billing;
  next();
});

// Using Helmet to mitigate common security issues via setting HTTP Headers, such as XSS Protect and setting X-Frame-Options to sameorigin, meaning it'll prevent iframe attacks
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true, // nonce when
      directives: {
        defaultSrc: ["'self'"],
        "script-src": ["'self'", (s: express.response, r: express.Response) => `'nonce-${r.locals["nonce"]}'`, "cdn.jsdelivr.net", "cdn.quilljs.com", "use.fontawesome.com", "cdnjs.cloudflare.com", "hcaptcha.com", "*.hcaptcha.com", "unpkg.com", "cdn.jsdelivr.net", "js.stripe.com"],
        "style-src": ["'self'", "cdn.quilljs.com", "cdn.jsdelivr.net", "use.fontawesome.com", "cdnjs.cloudflare.com", "hcaptcha.com", "*.hcaptcha.com", "unpkg.com", "fonts.googleapis.com", "use.fontawesome.com", "fontawesome.com"],
        "img-src": ["'self'", "i.imgur.com", "blob: http:", "data:"],
        "frame-src": ["'self'", "hcaptcha.com", "*.hcaptcha.com", "youtube.com", "youtu.be", "www.youtube.com"],
        "connect-src": ["'self'", "hcaptcha.com", "*.hcaptcha.com", "blob: http:"]
      }
    },
    xssFilter: true
  })
);

app.all("/api/:method*", apiLimiter, (r: express.Request, s: express.Response) => {
  const ep: Endpoint = endpoints.get(r.params.method)
  if (ep) { // Prevent site from sending errors when the :method is not defined.
    ep.prop.run(r, s);
  } else {
    return s.sendStatus(404);
  }
});

app.get("/", (r: express.Request, s: express.Response) => {
  if(!permissions.canViewPage(s.locals?.userData?.permission_id || 0, `/`)) return throw403(s);
  s.render(`${html}/index.eta`);
});

app.get("/:file", (r: express.Request, s: express.Response) => {
  const file = r.params.file.toLowerCase() == "billing" ? `${billing}/index.eta` : `${html}/${r.params.file.toLowerCase()}.eta`;
  if (!fs.existsSync(file)) return throw404(s);
  //if(!permissions.canViewPage(s.locals?.userData?.permission_id || 0, `/${r.params.file.toLowerCase()}`)) return throw403(s); Close to root => All websites under this should be accessible to anyone, but leaving this here for future if anything happens.
  s.render(file);
});

app.get("/:dir/:file", async (r: express.Request, s: express.Response) => {
  let file: string;
  switch (r.params.dir.toLowerCase()) {
    case "billing": {
      switch (r.params.file.toLowerCase()) {
        case "staff": {
          file = `${billing}/staff/overview.eta`;
          await handleStaff(r, s);
        } break;
        default: {
          file = `${billing}/${r.params.file.toLowerCase()}.eta`
        }
      }
    }
  }
  if (!fs.existsSync(file)) return throw404(s);
  if(!permissions.canViewPage(s.locals?.userData?.permission_id || 0, `/${r.params.dir.toLowerCase()}/${parseInt(r.params.file) ? ":id" : r.params.file.toLowerCase()}`)) return throw403(s);
  s.render(file);
});

app.get("/:dir/:subdir/:file", async (r: express.Request, s: express.Response) => {
  let file;
  switch (r.params.dir.toLowerCase()) {
    case "billing": {
      switch (r.params.subdir.toLowerCase()) {
        case "staff": {
          file = `${billing}/staff/${r.params.file.toLowerCase()}.eta`;
          s.locals.permissions = permIDs;
        } break;
        case "tickets": {
          if (parseInt(r.params.file)) {
            file = `${billing}/tickets/ticket.eta`;
            await handleTickets(r, s, false);
          } else {
            file = `${billing}/tickets/${r.params.file.toLowerCase()}.eta`;
          }
        } break;
        case "knowledgebase": {
          switch (r.params.file.toLowerCase()) {
            case "articles": {
              file = `${billing}/articles/articles.eta`
            }
          }
        }
      }
    } break;
  }
  if (!fs.existsSync(file)) return throw404(s);
  if(!permissions.canViewPage(s.locals?.userData?.permission_id || 0, `/${r.params.dir.toLowerCase()}/${r.params.subdir.toLowerCase()}/${parseInt(r.params.file) ? ":id" : r.params.file.toLowerCase()}`)) return throw403(s);
  s.render(file);
});

app.get("/:dir/:subdir1/:subdir2/:file", async (r: express.Request, s: express.Response) => {
  let file: string;
  switch (r.params.dir.toLowerCase()) {
    case "billing": {
      switch (r.params.subdir1.toLowerCase()) {
        case "staff": {
          s.locals.permissions = permIDs;
          switch (r.params.subdir2.toLowerCase()) {
            case "tickets": {
              if (parseInt(r.params.file)) {
                file = `${billing}/staff/ticket.eta`;
                await handleTickets(r, s, true);
              } else {
                file = `${billing}/staff/${r.params.file.toLowerCase()}.eta`;
              }
              break;
            }
            case "knowledgebase": {
              if (parseInt(r.params.file)) {
                file = `${billing}/staff/knowledgebase.eta`;
                await handleArticles(r, s, false);
              } else if(r.params.file.toLowerCase() == "articles"){
                file = `${billing}/staff/articles/${r.params.file.toLowerCase()}.eta`;
              }else{
                file = `${billing}/staff/${r.params.file.toLowerCase()}.eta`;
              }
              break;
            }
            case "user": {
              if(parseInt(r.params.file)) {
                file = `${billing}/staff/user.eta`;
                await handleUsers(r,s);
              }else{
                file = `${billing}/staff/${r.params.file.toLowerCase()}.eta`;
              }
              break;
            }
          }
        } break;
        case "knowledgebase": {
          switch (r.params.subdir2.toLowerCase()) {
            case "article": {
              if (parseInt(r.params.file)) {
                file = `${billing}/articles/article.eta`;
                await handleArticles(r, s, false);
              } else {
                file = `${billing}/staff/${r.params.file.toLowerCase()}.eta`;
              }
              break;
            }
          }
        }
      }
    } break;
  }
  if (!fs.existsSync(file)) return throw404(s);
  if(!permissions.canViewPage(s.locals?.userData?.permission_id || 0, `/${r.params.dir.toLowerCase()}/${r.params.subdir1.toLowerCase()}/${r.params.subdir2.toLowerCase()}/${parseInt(r.params.file) ? ":id" : r.params.file.toLowerCase()}`)) return throw403(s);
  s.render(file);
});

app.get("/:dir/:subdir1/:subdir2/:subdir3/:file", async (r: express.Request, s: express.Response) => {
  let file: string;
  switch (r.params.dir.toLowerCase()) {
    case "billing": {
      switch (r.params.subdir1.toLowerCase()) {
        case "staff": {
          s.locals.permissions = permIDs;
          switch (r.params.subdir2.toLowerCase()) {
            case "knowledgebase": {
              switch (r.params.subdir3.toLowerCase()) {
                case "article": {
                  if (parseInt(r.params.file)) {
                    file = `${billing}/staff/articles/article.eta`;
                    await handleArticles(r, s, true);
                  } else {
                    file = `${billing}/staff/${r.params.file.toLowerCase()}.eta`;
                  }
                } break;
                case "editor": {
                  if (parseInt(r.params.file)) {
                    file = `${billing}/staff/articles/editor.eta`;
                    await handleArticles(r, s, true);
                  } else {
                    file = `${billing}/staff/${r.params.file.toLowerCase()}.eta`;
                  }
                }
              }
            } break;
          }
        } break;
      }
    } break;
  }
  if (!fs.existsSync(file)) return throw404(s);
  if(!permissions.canViewPage(s.locals?.userData?.permission_id || 0, `/${r.params.dir.toLowerCase()}/${r.params.subdir1.toLowerCase()}/${r.params.subdir2.toLowerCase()}/${r.params.subdir3.toLowerCase()}/${parseInt(r.params.file) ? ":id" : r.params.file.toLowerCase()}`)) return throw403(s);
  s.render(file);
});
app.all('*', (r: express.Request, s: express.Response) => {
  throw404(s);
});

// start up the website
app.listen(config.website.port, () => {
  console.log(`started website @${config.website.port}`);
  cdn.host(redisClient);
});

function throw404(s: express.Response) {
  Math.floor(Math.random() * 20) ? s.render(`${billing}/404.eta`) : s.render(`${html}/util/easter_egg.eta`);
}

function throw403(s: express.Response) {
  s.render(`${billing}/login.eta`);
}

async function handleTickets(r: express.Request, s: express.Response, staff: boolean) {
  if (!s.locals.userData) return throw403(s);
  const getTicket: Ticket = await redisClient.db.hgetall(`ticket:${parseInt(r.params.file)}`);
  if (!getTicket) return throw404(s);
  if (staff) {
    if (getTicket.level > s.locals?.userData?.permission_id) return throw403(s);
    if (getTicket.user_id == s.locals?.userData?.user_id) return throw403(s);
  } else {
    if (getTicket.user_id != s.locals?.userData?.user_id) return throw403(s);
  }
  s.locals.ticket = JSON.stringify(getTicket);
}
async function handleArticles(r: express.Request, s: express.Response, staff: boolean) {
  if (!s.locals.userData) return throw403(s);
  const getArticle: Article = await redisClient.db.hgetall(`article:${parseInt(r.params.file)}`);
  if (!getArticle) return throw404(s);
  if (staff) {
    if (getArticle.permission_id > s.locals?.userData?.permission_id) return throw403(s);
  }else{
    if(getArticle.state != 1) return throw403(s);
  }
  s.locals.article = JSON.stringify(getArticle);
  s.locals.article_categories = JSON.stringify(article_categories);
}
async function handleStaff(r: express.Request, s: express.Response) { //TODO: USE API ENDPOINT INSTEAD OF THIS.
  return new Promise((resolve, reject) => {
    s.locals.permissions = permIDs;
    redisClient.keys("user:*", async function (err, result) {
      if (err) {
        console.error(err);
        s.status(500).send("An error occurred while retrieving the announcements. Please report this.")
        return reject(err);
      }
      s.locals.users = JSON.stringify(await Promise.all(result.map(async userID => {
        const user: UserData = await redisClient.db.hgetall(userID);
        return { id: user.user_id, registered: user.registered, permission: user.permission_id };
      })));
      resolve(true);
    });
  })
}
async function handleUsers(r: express.Request, s: express.Response) {
  if (!s.locals.userData) return throw403(s);
  const getUser: UserData = await redisClient.db.hgetall(`user:${parseInt(r.params.file)}`);
  if (!getUser) return throw404(s);
  s.locals.user = JSON.stringify(getUser);
}
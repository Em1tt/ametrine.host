// entry point file that gets started with the start script
// NOTE: to run with args, use `npm run start -- --arg`
// imports
import "dotenv/config";
import http        from "http";
import express     from "express";
import compression from "compression";
import vhost       from "vhost";
import morgan      from "morgan";
import rateLimit   from "express-rate-limit";
import path        from "path";

// files
import config   from "./config.json";
import { util } from "./util";
import { db }   from "./database";

const app   : express.Application = express();
const server: http.Server         = http.createServer(app);
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1
});
console.log(process.argv);

// initialize database
// note for self: ["npm", "run", "start", "--no-redis"]
// npm run start --no-redis
db.init();

if (!process.argv.includes("--no-log"))
  app.use(morgan("[express] :method :url :status :res[content-length] - :response-time ms")); // logging

// do express stuff
app.use(express.static(path.join(__dirname, "views")));
app.use("/*", limiter);  // ratelimit the main webpage
app.use(compression()); // use gzip

// use ejs engine
app.set("view engine", "ejs");

// use all files from the views folder
app.set("views", path.join(__dirname, "views"));

// http://localhost:port/ route
app.get("/", (r: express.Request, s: express.Response) => {
  s.render("index");
});

// everything else (404)
app.use((r: express.Request, s: express.Response) => {
  s.status(404).render("404");
});

// start up the website
app.listen(config.website.port, () => {
  util.expressLog(`started website @${config.website.port}`);
});

// close safely
process.on("SIGINT", () => {
  // stop http server
  server.close(() => {
    util.expressLog(`http server stopped`)
  });

  // have to do this because nodejs hangs otherwise (could have done it with if (...) return)
  if (!process.argv.includes("--no-redis")) {
    // disconnect redis client
    db.client.quit();
    util.redisLog(`client disconnected`);
    // stop redis server
    db.server.close((e) => {
      util.redisLog(`server closed`)
    });
  }

  // close nodejs
  process.exit(0);
});

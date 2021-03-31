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

// initialize database
//db.init();

app.use(morgan("[express] :method :url :status :res[content-length] - :response-time ms")); // logging

// do express stuff
app.use(express.static(path.join(__dirname, "views")));
app.use("/", limiter);  // ratelimit the main webpage
app.use(compression()); // use gzip

// use ejs engine
app.engine("html", require("ejs").renderFile);
app.set("view engine", "html");

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
  server.close(() => util.expressLog(`http server stopped`));

  // disconnect redis client
  db.client.quit();
  util.redisLog(`client disconnected`);
  // stop redis server
  db.server.close((e) => util.redisLog(`server closed`));

  // close nodejs
  process.exit(0);
});

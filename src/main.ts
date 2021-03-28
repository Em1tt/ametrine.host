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
import { sql }  from "./database";

const app   : express.Application = express();
const server: http.Server         = http.createServer(app);
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30
});

// initialize database
// sql.init();

app.use(morgan("[express] :method :url :status :res[content-length] - :response-time ms")); // logging

// do express stuff
app.use(express.static(path.join(__dirname, "views")));
app.use("/", limiter);  // ratelimit the main webpage
app.use(compression()); // use gzip

// use all files from the views folder
app.set("views", path.join(__dirname, "views"));

// http://localhost:port/ route
app.get("/", (r: express.Request, s: express.Response) => {
  s.render("index");
});

// start up the website
app.listen(config.website.port, () => {
  util.expressLog(`started website @${config.website.port}`);
});

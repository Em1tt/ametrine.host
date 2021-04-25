// imports
import express     from "express";
import compression from "compression";
import morgan      from "morgan";
import path        from "path";
import config      from "../config.json";
import { util }    from "../util";
const app: express.Application = express();

app.use(morgan("[express]\t:method :url :status :res[content-length] - :response-time ms"));

// do express stuff
app.use(express.static(path.join(__dirname, "views")));
app.use(compression()); // use gzip

app.set("view engine", "ejs");
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

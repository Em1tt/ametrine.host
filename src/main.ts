// imports
import http        from "http";
import express     from "express";
import compression from "compression";
import path        from "path";
import config      from "./config.json";

const app   : express.Application = express();
// for fancy http server features
const server: http.Server         = http.createServer(app);

app.use(express.static(path.join(__dirname, "views")));
app.use(compression()); // use gzip

// use all files from the views folder
app.set("views", path.join(__dirname, "views"));

// http://localhost:port/ route
app.get("/", (r: express.Request, s: express.Response) => {
  s.render("index");
});

// start up the website
app.listen(config.website.port, () => {
  console.log(`website started @${config.website.port}`);
});

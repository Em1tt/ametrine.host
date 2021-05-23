// imports
import express      from "express";
import compression  from "compression";
import morgan       from "morgan";
import minify       from "express-minify";
import path         from "path";
import fs           from "fs";
import * as eta     from "eta";
import config       from "../config.json";
import { util }     from "../util";
import { Endpoint } from "../types/endpoint";

const app : express.Application = express();
const html: string = path.join(__dirname, "views", "html");

const endpoints: Map<string, Endpoint> = new Map();
const files    : Array<string>         = fs.readdirSync(`./dist/modules/api`)
                                           .filter((f) => f.endsWith(".js"));
for (const f of files) {
  const ep: Endpoint = require(`./api/${f.replace(".js", "")}`);
  endpoints.set(ep.prop.name, ep);
}
util.expressLog(`${endpoints.size} api endpoints loaded`);

app.use(morgan("[express]\t:method :url :status :res[content-length] - :response-time ms"));

// gzip
app.use(compression());
// minify static files
app.use(minify());
// serve static files
app.use(express.static(path.join(__dirname, "views")));
// eta
app.engine("eta", eta.renderFile);
app.set("view engine", "eta");

app.get("/", (r: express.Request, s: express.Response) => {
  s.sendFile(`${html}/index.html`);
});

/* amethyst.host/api/bill
   amethyst.host/api/auth
   and so on..            */
app.get("/api/:method", (r: express.Request, s: express.Response) => {
  endpoints.get(r.params.method).prop.run(r, s);
});

// "smart" router
app.get("/:name", (r: express.Request, s: express.Response) => {
  const file = `${html}/${r.params.name}.html`;

  if (!fs.existsSync(file)) return s.status(404)
                                    .send("if you were searching for a 404.. you found it!!");
  s.sendFile(file);
});

// start up the website
app.listen(config.website.port, () => {
  util.expressLog(`started website @${config.website.port}`);
});

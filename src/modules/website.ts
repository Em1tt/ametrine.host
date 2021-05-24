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
import helmet       from "helmet"
import bodyParser   from "body-parser"
import cookieParser from "cookie-parser"

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

// Create Parse for application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false })) // Required for req.body
// Create Parse for application/json
app.use(bodyParser.json())
// Create Parse for Cookies
app.use(cookieParser())

// Using Helmet to mitigate common security issues via setting HTTP Headers, such as XSS Protect and setting X-Frame-Options to sameorigin, meaning it'll prevent iframe attacks
app.use(helmet());

// eta
app.engine("eta", eta.renderFile);
app.set("view engine", "eta");

app.get("/", (r: express.Request, s: express.Response) => {
  s.render(`${html}/index.eta`);
});

// Probably another method to do this, but this is the best I can think of right now.
const apiMethod = function(r: express.Request, s: express.Response) {
  const ep: Endpoint = endpoints.get(r.params.method)
  if (ep) { // Prevent site from sending errors when the :method is not defined.
    ep.prop.run(r, s);
  } else {
    return s.status(404)
            .send("if you were searching for a 404.. you found it!!");
  }
}

/* amethyst.host/api/bill
   amethyst.host/api/auth
   and so on..            */
app.get("/api/:method", (r: express.Request, s: express.Response) => {
  apiMethod(r, s);
});
app.post("/api/:method", (r: express.Request, s: express.Response) => {
  apiMethod(r, s);
});

// "smart" router
app.get("/:name", (r: express.Request, s: express.Response) => {
  const file = `${html}/${r.params.name}.eta`;

  if (!fs.existsSync(file)) return s.status(404)
                                    .send("if you were searching for a 404.. you found it!!");
  s.render(file);
});

// start up the website
app.listen(config.website.port, () => {
  util.expressLog(`started website @${config.website.port}`);
});

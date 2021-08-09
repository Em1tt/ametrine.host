// imports
import express      from "express";
import morgan       from "morgan";
import path         from "path";
import fs           from "fs";
import * as eta     from "eta";
import config       from "../config.json";
import { util }     from "../util";
import { Endpoint } from "../types/endpoint";
import helmet       from "helmet"
import cookieParser from "cookie-parser"
import { auth }     from "./api/auth"
import * as plans from "../plans.json"
//import cors       from "cors"

const app : express.Application = express();
const html: string = path.join(__dirname, "views", "html");
const billing: string = path.join(__dirname, "views", "billing", "html");

const endpoints: Map<string, Endpoint> = new Map();
const files    : Array<string>         = fs.readdirSync(`./dist/modules/api`)
                                           .filter((f) => f.endsWith(".js"));

for (const f of files) {
  const ep: Endpoint = require(`./api/${f.replace(".js", "")}`);
  endpoints.set(ep.prop.name, ep);
}
util.expressLog(`${endpoints.size} api endpoints loaded`);

app.use(cookieParser())

app.use(morgan("[express]\t:method :url :status :res[content-length] - :response-time ms"));

// serve static files
app.use(express.static(path.join(__dirname, "views")));

// Create Parse for application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: false })) // Required for req.body
app.use('/api/order/webhook', express.raw({type: 'application/json'}));
// Create Parse for application/json
app.use(express.json())
// Create Parse for Cookies

// Using Helmet to mitigate common security issues via setting HTTP Headers, such as XSS Protect and setting X-Frame-Options to sameorigin, meaning it'll prevent iframe attacks
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true, // nonce when
      directives: {
        defaultSrc: ["'self'", "www.recaptcha.net"],
        "script-src": ["'self'", "'unsafe-inline'", "static.cloudflareinsights.com", "unpkg.com", "www.recaptcha.net", "cdn.jsdelivr.net", "ajax.googleapis.com", "*.gstatic.com", "js.stripe.com", "pixijs.download", "'unsafe-eval'"], // unsafe eval worst idea, pixijs why do you have this
        "style-src": ["'self'", "'unsafe-inline'", "unpkg.com", "fonts.googleapis.com", "*.gstatic.com", "use.fontawesome.com", "fontawesome.com"],
        "script-src-attr": ["'self'", "'unsafe-inline'"]
      }
    },
    xssFilter: true
  }
));

// eta
app.engine("eta", eta.renderFile);
app.set("view engine", "eta");

app.use(async (r: express.Request, s: express.Response, next: express.NextFunction) => {
  const userData = await auth.getUserData(r, s)
  s.locals.userData = userData
  next()
})



app.get("/", (r: express.Request, s: express.Response) => {
  s.render(`${html}/index.eta`);
});

// Probably another method to do this, but this is the best I can think of right now.
const apiMethod = function (r: express.Request, s: express.Response) {
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
app.all("/api/:method*", (r: express.Request, s: express.Response) => {
  apiMethod(r, s);
});
// billing
app.get("/billing", (r: express.Request, s: express.Response) => {
  // You could use ETA and test whether or not it._locals.userData isnt null, and if it is then show stuff like Manage Account, similar to how you have "(!it.name.length) ?" in index.eta
  const userData = s.locals.userData;
  console.log(userData);
  s.render(`${billing}/index.eta`, {
    userdata: userData
  }
);
});
app.get("/billing/order", (r: express.Request, s: express.Response) => {
  //console.log(r);
  const file = `${billing}/order.eta`;

  if (!fs.existsSync(file)) return s.status(404)
                                    .send("if you were searching for a 404.. you found it!!");
  let id = r.query?.id?.toString(); //Optional chaining. Thank you ECMA!
  let item = r.query?.type?.toString();
  if(!id){
    id = "0"
  }
  if(!item){
    id = "vps"
  }
  let details = plans?.[item]?.[id];
  if(!details){ //Default values so the backend doesn't shit itself when someone forges queries
      id = "0";
      item = "vps";
      details = plans[item][id];
  }
    const desc = plans[item].description;
    console.log(details);
    const userData = s.locals.userData;
  s.render(file, {
    details: details,
    item: item,
    itemid: id,
    description: desc,
    userData: userData
  });
});



app.get("/billing/:name", (r: express.Request, s: express.Response) => {
  const file = `${billing}/${r.params.name}.eta`;

  if (!fs.existsSync(file)) return s.status(404)
                                    .send("if you were searching for a 404.. you found it!!");
  const userData = s.locals.userData;
  s.render(file, {
    userData: userData
  });
});

app.get("/.env", (r: express.Request, s: express.Response) => {
  s.redirect("https://youtu.be/dQw4w9WgXcQ");
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

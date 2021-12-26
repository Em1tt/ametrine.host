// imports
import express       from "express";
import morgan        from "morgan";
import path          from "path";
import config        from "../config.json";
import { util }      from "../util";
import helmet        from "helmet"
import rateLimit     from "express-rate-limit";
import fs            from "fs"
import { imageopto, hasSupportedExtension } from 'hastily';

const cdnPath: string = path.join(__dirname, "/../../data", "cdn");

export const cdn = {
    /**
     * Hosts the CDN server
     * @returns Boolean
     */
    host: (): boolean => {
        const app    : express.Application = express();
        //express.static(path.join(__dirname, "/../../data/cdn"))

        app.use(rateLimit({
            windowMs: 40 * 1000,
            max: 30,
            message: "You are sending too many API requests! Please try again later."
        }))

        app.use(morgan("[express cdn]\t:method :url :status :res[content-length] - :response-time ms"));

        // serve static files
        //app.use(express.static(path.join(__dirname, "/../../data/cdn")));

        // Create Parse for application/x-www-form-urlencoded
        app.use(express.urlencoded({ extended: false })) // Required for req.body
        // Create Parse for application/json
        app.use(express.json())

        // Using Helmet to mitigate common security issues via setting HTTP Headers, such as XSS Protect and setting X-Frame-Options to sameorigin, meaning it'll prevent iframe attacks
        app.use(helmet());
        app.use("/", imageopto({
            filter: (req) => hasSupportedExtension(req)
        }), express.static(cdnPath))

        app.get("/*", (r: express.Request, s: express.Response) => {
            s.sendStatus(403)
        });


        // "smart" router
        /*
        app.get("/:name", (r: express.Request, s: express.Response) => {
        const file = `${html}/${r.params.name}.eta`;

        if (!fs.existsSync(file)) return s.render(`${html}/404.eta`);
        s.render(file);

        });
        */
        app.listen(config.cdn.port, () => {
            util.expressLog(`started CDN @${config.cdn.port}`);
        });
        return true;
    },
    delete: (dir: string, file: string): Promise<void> => {
        return new Promise((resolve, reject) => {
            if (!fs.existsSync(cdnPath + "/" + dir)) return reject();
            if (!fs.existsSync(cdnPath + "/" + dir + "/" + file)) reject();
            fs.unlink(cdnPath + "/" + dir + "/" + file, function(err) {
                if (err) reject(err);
                resolve();
            });
        })
    }
}
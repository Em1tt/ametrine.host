// imports
import express       from "express";
import morgan        from "morgan";
import path          from "path";
import config        from '../config.json';
import { util }      from '../util';
import helmet        from "helmet"
import rateLimit     from "express-rate-limit";
import cookieParser  from "cookie-parser"
import fs            from "fs"
import { imageopto, hasSupportedExtension } from 'hastily';
import crypto        from "crypto";
import mime          from "mime";
import { auth }      from './api/auth';

const formats = ['gif', 'png', 'png8', 'jpg', 'pjpg', 'webp', 'webpll', 'webply']

const cdnPath: string = path.join(__dirname, "/../../data", "cdn");

export const cdn = {
    /**
     * Hosts the CDN server
     * @returns Boolean
     */
    host: (redis: any): boolean => {
        if (!redis) {
            console.error("Redis Client not initialized");
            return false;
        }
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
        app.use(cookieParser())

        // Using Helmet to mitigate common security issues via setting HTTP Headers, such as XSS Protect and setting X-Frame-Options to sameorigin, meaning it'll prevent iframe attacks
        app.use(helmet());
        app.get("/*", (r: express.Request, s: express.Response, next: express.Next) => {
            if (hasSupportedExtension(r)) {
                if (fs.existsSync(cdnPath + r.path + ".enc")) {
                    //s.set('Content-Type', mime.getType(r.path.split(".")[r.path.split(".").length - 1]));
                    fs.readFile(cdnPath + r.path + ".enc", 'binary', async function(err, data) {
                        if (err) {
                            console.error(err);
                            return s.status(500).send("There was an error while reading the file! Please report this.");
                        }
                        const type = r.path.split("/")[2];
                        const name = r.path.split("/")[3];
                        let userData = await auth.verifyToken(r, s, false, "both");
                        if (userData == 101) {
                            const newAccessToken = await auth.regenAccessToken(r, s);
                            if (typeof newAccessToken != "string") return false;
                            userData = await auth.verifyToken(r, s, false, "both")
                        }
                        if (typeof userData != "object") return s.sendStatus(userData);
                        switch (type) {
                            case "tickets": {
                                const getTicket = await redis.db.hgetall(`ticket:${name.split("-")[0]}`);
                                if (!getTicket) return s.sendStatus(403);
                                if (getTicket.user_id != userData["user_id"] && userData["permission_id"] != `2:${getTicket.level}`) return s.sendStatus(403);
                                const decrypted = await cdn.decrypt(Buffer.from(data, 'binary'), getTicket["key"]);
                                const b64 = Buffer.from(decrypted.toString('utf-8'), 'base64');
                                s.writeHead(200, {
                                    'Content-Type': mime.getType(r.path.split(".")[r.path.split(".").length - 1]),
                                    'Content-Length': b64.length
                                });
                                return s.end(b64); 
                                //return s.send(utils.decode_base64(decrypted.toString()));
                            }
                            default:
                                return s.sendStatus(403);
                        }
                    })
                } else {
                    if (r.path.endsWith(".enc")) return s.sendStatus(403)
                    return next();
                }
            } else {
                s.sendStatus(403)
            }
        });
        app.use("/", imageopto({
            filter: (req) => hasSupportedExtension(req) && formats.filter(x => req.path.endsWith(`.${x}`)).length > 0,
        }), express.static(cdnPath, {
            dotfiles: "deny",
            extensions: formats
        }))


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
    /**
     * Uploading files
     * @param dir Directory (or category) of the file
     * @param file File name
     * @param data Data encoded in base64
     * @param encrypt If the file should be encrypted
     * @param key The key to encrypt the file with (If encrypt is true)
     */
    upload: (dir: string, file: string, data: string, encrypt: boolean, key?: string): Promise<boolean> => {
        return new Promise((resolve, reject) => {
            try {
                if (!fs.existsSync(cdnPath + "/" + dir)) {
                    fs.mkdirSync(cdnPath + "/" + dir)
                }
                if (fs.existsSync(cdnPath + "/" + dir + "/" + file)) reject();
                //const binary = Buffer.from(data.split(",")[1], 'base64');
                //if (!binary) return reject("Invalid Binary");
                let output: string | Buffer = data.split(",")[1];
                //const type: fs.WriteFileOptions = 'base64';
                if (encrypt) {
                    file = file + ".enc"
                    output = cdn.encrypt(output, key);
                    //type = 'binary';
                }
                fs.writeFile(`${cdnPath}/${dir}/${file}`, output, 'base64', function(err) {
                    if (err) return reject(err);
                    return resolve(true);
                });
            } catch(e) {
                reject(e);
                console.error(e);
            }
        })
    },
    rename: (dir: string, file: string, renameTo: string): Promise<void> => {
        return new Promise((resolve, reject) => {
            if (!fs.existsSync(cdnPath + "/" + dir)) return reject();
            if (!fs.existsSync(cdnPath + "/" + dir + "/" + file)) reject();
            fs.rename(cdnPath + "/" + dir + "/" + file, renameTo, function(err) {
                if (err) reject(err);
                resolve();
            });
        })
    },
    encrypt: (data: string, key: string): Buffer => {
        const cipherKey = crypto.createHash('sha256').update(key).digest();
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-ctr', cipherKey, iv);
        const result = Buffer.concat([iv, cipher.update(data), cipher.final()]);
        return result;
    },
    decrypt: (data: Buffer, key: string): Buffer => {
        const cipherKey = crypto.createHash('sha256').update(key).digest();
        const iv = data.slice(0, 16);
        const decipher = crypto.createDecipheriv('aes-256-ctr', cipherKey, iv);   // Actually decrypt it
        const result = Buffer.concat([decipher.update(data.slice(16)), decipher.final()]);
        return result;
    },
    /**
     * Deleting files
     * @param dir Directory (or category) of the file
     * @param file File name
     * @returns Promise<void>
     */
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
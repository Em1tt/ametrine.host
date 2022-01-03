// mail box
import { SMTPServer }   from "smtp-server";
import { simpleParser } from "mailparser";
import util   from "../util";
import fs     from "fs";
import config from "../config.json";

const limit = 200;

export const mailbox = {
  receiveMail: (p, session, callback) => {
    if (!config.mail.mails.includes(p.to.text.trim())) return errorHandler(510, callback);
    console.log(`Received E-Mail from "${p.from.text}"`);
    const mail = `${p.from.text} wrote:\n\n---------------------\nSubject: ${p.subject}\n\nText: ${p.text}\n\n${p.attachments.map(a => a.content)}\n`;
    fs.mkdir(`./data/mail/${p.to.text}`, (err): void => {
      if (err && !fs.existsSync(`./data/mail/${p.to.text}`)) return console.error(err);
    });
    setTimeout(() => {
      fs.mkdir(`./data/mail/${p.to.text}/${p.date.toDateString().replace(new RegExp(":", "g"), ".").replace(" ", "-")}`, (err): void => {
        if (err && !fs.existsSync(`./data/mail/${p.to.text}/${p.date.toDateString().replace(new RegExp(":", "g"), ".").replace(" ", "-")}`)) return console.error(err);
      });
    }, 1000);
    setTimeout(() => {
      fs.readdir(`./data/mail/${p.to.text}/${p.date.toDateString().replace(new RegExp(":", "g"), ".").replace(" ", "-")}`, (err, files) => {
        if (files.length > limit) return errorHandler(422, callback);
        fs.writeFile(`./data/mail/${p.to.text}/${p.date.toDateString().replace(new RegExp(":", "g"), ".").replace(" ", "-")}/${p.from.text.split("@")[0]}-${files.length}`, mail, (err): void => {
          if (err) console.log(err);
        });
      });
    }, 2000);
    callback();    
  },
}
// Port 25 already in use probably happens because im importing from src/modules/api/mail.ts

function errorHandler(code: number, callback): void {
  switch (code) {
    case 510: callback(new Error(`${code} Bad email address.`)); break;
    case 541: callback(new Error(` ${code} The recipient address rejected your message: ratelimit reached. Please try again in an hour. Further attempts may flag your account as a spambot and blacklist it.`)); break;
    case 554: callback(new Error(` ${code} The incoming server thinks that your email is spam, or your IP has been blacklisted.`)); break;
    case 422: callback(new Error(`${code} The recipient's mailbox has exceeded its storage limit. (max. ${limit} per day.)`)); break;
    default: callback(new Error(`500 Internal server error.`)); break;
  }
}

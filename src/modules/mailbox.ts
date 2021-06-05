// mail server
import { SMTPServer }   from "smtp-server";
import { simpleParser } from "mailparser";
import { util }         from "../util";
import fs               from "fs";
import config           from "../config.json";

const server: SMTPServer = new SMTPServer({
  onData(stream, session, callback) {
    simpleParser(stream, {}, (e, p) => {
      if (e) return util.mailLog(`err: ${e}`);
      if(!config.mail.mails.includes(p.to.text.trim())) return callback(new Error("510: E-Mail address does not exist!"));
      util.mailLog(`Received E-Mail from "${p.from.text}"`);
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
          console.log(files);
        });
        fs.writeFile(`./data/mail/${p.to.text}/${p.date.toDateString().replace(new RegExp(":", "g"), ".").replace(" ", "-")}/a`, mail, (err): void => {
          if (err) console.log(err);
        });
      }, 2000);
      stream.on("end", callback);
    })
  },
  disabledCommands: ["AUTH"]
});

server.listen(config.mail.port, "0.0.0.0", () => util.mailLog("server started"));

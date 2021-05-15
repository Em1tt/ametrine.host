// mail server
import { SMTPServer }   from "smtp-server";
import { simpleParser } from "mailparser";
import { util }         from "../util";
import fs from "fs";
import config           from "../config.json";

const server: SMTPServer = new SMTPServer({
  onData(stream, session, callback) {
    simpleParser(stream, {}, (e, p) => {
      if (e) return util.mailLog(`err: ${e}`);
      util.mailLog(`"${p.subject}" from ${p.from.text}`);
      util.mailLog(`${p.text}`);
      const mail = `${p.from.text} wrote:\n\n---------------------\n${p.subject}\n\n${p.text}\n\n${p.attachments.map(a => a)}`;
      fs.mkdir(`./data/mail/${p.to.text}`, (err) => {
        if(err) console.log(err);
      });
      setTimeout(()=>{
        fs.writeFile(`./data/mail/${p.to.text}/${p.date.toISOString().replace(new RegExp(":", "g"), ".")}`, mail, (err): void => {
          console.log(err);
        });
      },1000);
      stream.on("end", callback);
    })
  },
  disabledCommands: ["AUTH"]
});

server.listen(config.mail.port, "0.0.0.0", () => util.mailLog("server started"));

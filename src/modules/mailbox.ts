// mail server
import { SMTPServer }   from "smtp-server";
import { simpleParser } from "mailparser";
import { util }         from "../util";
import { writeFile } from "fs";
import config           from "../config.json";

const server: SMTPServer = new SMTPServer({
  onData(stream, session, callback) {
    simpleParser(stream, {}, (e, p) => {
      if (e) return util.mailLog(`err: ${e}`);
      util.mailLog(`Received E-Mail from ${p.from.text} regarding: ${p.subject}`);
      const mail = `${p.from.text} wrote:\n\n---------------------\n${p.subject}\n\n${p.text}\n\n${p.attachments.map(a => a)}`;
      writeFile(`./data/mail/${p.to.text}/${p.date.toISOString()}.txt`, mail, (err): void => {
        err;
      });
      stream.on("end", callback);
    })
  },
  disabledCommands: ["AUTH"]
});

server.listen(config.mail.port, "0.0.0.0", () => util.mailLog("server started"));

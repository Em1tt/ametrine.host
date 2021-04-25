// mail server
import { SMTPServer }   from "smtp-server";
import { simpleParser } from "mailparser";
import { util }         from "../util";
import config           from "../config.json";

const server: SMTPServer = new SMTPServer({
  onData(stream, session, callback) {
    simpleParser(stream, {}, (e, p) => {
      if (err) return util.mailLog(`err: ${e}`);

      util.mailLog(`"${p.subject}" from ${p.from.text}`);
      util.mailLog(`${p.text}`);
      stream.on("end", callback);
    })
  },
  disabledCommands: ["AUTH"]
});

server.listen(config.mail.port);

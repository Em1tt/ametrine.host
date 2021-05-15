// mail server
import { SMTPServer }   from "smtp-server";
import { simpleParser } from "mailparser";
import { util }         from "../util";
import config           from "../config.json";

const server: SMTPServer = new SMTPServer({
  onData(stream, session, callback) {
    simpleParser(stream, {}, (e, p) => {
      if (e) return util.mailLog(`err: ${e}`);

      util.mailLog(`"${p.subject}" from ${p.from.text} for ${p.to.text}`);
      util.mailLog(`${p.text}`);
      stream.on("end", callback);
    })
  },
  disabledCommands: ["AUTH"],
  authOptional: true
});

server.listen(config.mail.port, "0.0.0.0", () => util.mailLog("server started"));

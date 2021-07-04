// mail server
import { SMTPServer } from "smtp-server";
import { simpleParser } from "mailparser";
import { util } from "../util";
import fs from "fs";
import config from "../config.json";
import { mailbox } from "./mailbox"
const server: SMTPServer = new SMTPServer({
    onData(stream, session, callback) {
      simpleParser(stream, {}, (e, p) => {
        if (e) return util.mailLog(`err: ${e}`);
        return mailbox.receiveMail(p, session, callback);
      })
    },
    disabledCommands: ["AUTH"]
});
  
// server.listen keeps crashing with my firewall saying I cant run port 25, if you're facing the same issue, comment out server.listen
  
server.listen(config.mail.port, "0.0.0.0", () => util.mailLog("server started"));
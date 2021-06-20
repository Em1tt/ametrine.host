// mail server
import { SMTPServer } from "smtp-server";
import { simpleParser } from "mailparser";
import { util } from "../util";
import fs from "fs";
import config from "../config.json";

const limit = 200;


function Ratelimit(limits: Record<string, number>, cache: Record<string, Array<string>>) {
  this.limits = limits;
  this.cache = cache;
}

Ratelimit.prototype.getLimit = function getLimit() {
  return this.limits;
}
Ratelimit.prototype.getCache = function getCache() {
  return this.cache;
}

Ratelimit.prototype.addAddress = function addAddress(address: string) {
  this.cache.receivedFrom.push(address);
}

Ratelimit.prototype.removeAddress = function removeAddress(address: string) {
  this.cache.receivedFrom.splice(this.cache.receivedFrom.indexOf(address), 1);
}

Ratelimit.prototype.getOccurrenceCount = function getOccurrenceCount(address: string) {
  this.cache.receivedFrom.filter(a => a == address).length;
}

Ratelimit.prototype.addIgnore = function addIgnore(address: string) {
  this.cache.ignored.push(address);
}

Ratelimit.prototype.removeIgnore = function removeIgnore(address: string) {
  this.cache.ignored.splice(this.cache.ignored.indexOf(address), 1);
}

Ratelimit.prototype.addIgnoreMem = function addIgnoreMem(address: string) {
  this.cache.ignoredMem.push(address);
}

Ratelimit.prototype.removeIgnoreMem = function removeIgnoreMem(address: string) {
  this.cache.ignoredMem.splice(this.cache.ignoredMem.indexOf(address), 1);
}

Ratelimit.prototype.addBan = function addBan(address: string) {
  this.cache.banned.push(address);
}

const ratelimit = new Ratelimit({
  ignore: 5,
  ignoreFor: 3600,
  ignoreInt: 30,
  forgetIgnore: 14400,
  ban: 9,
  banFor: Infinity,
  banInt: 30
}, {
  receivedFrom: [],
  ignored: [],
  ignoredMem: [],
  banned: []
});

const server: SMTPServer = new SMTPServer({
  onData(stream, session, callback) {
    simpleParser(stream, {}, (e, p) => {
      if (e) return util.mailLog(`err: ${e}`);
      if (!config.mail.mails.includes(p.to.text.trim())) return errorHandler(510, callback);

      //Put into ratelimit
      if(ratelimit.getOccurrenceCount(p.from.text) > ratelimit.getLimit().ignore && !ratelimit.getCache().ignored.includes(p.from.text)){
        if(!ratelimit.getCache.ignored.includes(p.from.text)){
          ratelimit.addIgnore(p.from.text);
          ratelimit.addIgnoreMem(p.from.text);
          setTimeout(() => {
            ratelimit.removeIgnore(p.from.text);
          }, ratelimit.getLimit().ignoreFor);
          setTimeout(() => {
            ratelimit.removeIgnoreMem(p.from.text);
          }, ratelimit.getLimit().forgetIgnore);
        }
        return errorHandler(510, callback);
      }else if(ratelimit.getOccurrenceCount(p.from.text) > ratelimit.getLimit().ban && ratelimit.getCache().ignoredMem.includes(p.from.text)){
        if(!ratelimit.getCache.banned.includes(p.from.text)){
          ratelimit.addBan(p.from.text);
        }
        return errorHandler(554, callback);
      }
      ratelimit.addAddress(p.from.text);
      setTimeout(() => {
        ratelimit.removeAddress(p.from.text);
      }, ratelimit.getLimit().ignoreInt * 1000);

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
          if (files.length > limit) return errorHandler(422, callback);
          fs.writeFile(`./data/mail/${p.to.text}/${p.date.toDateString().replace(new RegExp(":", "g"), ".").replace(" ", "-")}/${p.from.text.split("@")[0]}-${files.length}`, mail, (err): void => {
            if (err) console.log(err);
          });
        });
      }, 2000);
      callback();
    })
  },
  disabledCommands: ["AUTH"]
});

server.listen(config.mail.port, "0.0.0.0", () => util.mailLog("server started"));

function errorHandler(code: number, callback): void {
  switch (code) {
    case 510: callback(new Error(`${code} Bad email address.`)); break;
    case 541: callback(new Error(` ${code} The recipient address rejected your message: ratelimit reached. Please try again in an hour. Further attempts may flag your account as a spambot and blacklist it.`)); break;
    case 554: callback(new Error(` ${code} The incoming server thinks that your email is spam, or your IP has been blacklisted.`)); break;
    case 422: callback(new Error(`${code} The recipient's mailbox has exceeded its storage limit. (max. ${limit} per day.)`)); break;
    default: callback(new Error(`500 Internal server error.`)); break;
  }
}
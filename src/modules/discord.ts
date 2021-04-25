// discord bot!!
import "dotenv/config";
import Discord     from "discord.js";
import fs          from "fs";
import config      from "../config.json";
import { Command } from "../types/discord/command";
import { util }    from "../util";

const bot: Discord.Client = new Discord.Client();
      bot.cmds            = new Discord.Collection();

bot.once("ready", () => {
  util.discordLog("logged in");

  fs.readdirSync("./cmds")
    .filter( (f) => f.endsWith(".js"))
    .forEach((f) => {
      const cmd = require(`./cmds/${f}`);
      bot.cmds.set(cmd.name, cmd);
    });
});

bot.on("message", (msg: Discord.Message) => {
  const args: Array<string> = msg.split(" ");
  const cmd : string        = args[0].substring(config.discord.prefix.length);

  // remove the command argument
  args.shift();

  try {
    bot.cmds.get(cmd).run(bot, msg, args);
  } catch (e) {
    util.discordLog(e);
  }
});

bot.login(process.env.TOKEN);

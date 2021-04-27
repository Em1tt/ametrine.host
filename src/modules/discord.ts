// discord bot
import "dotenv/config";
import Discord     from "discord.js";
import fs          from "fs";
import config      from "../config.json";
import { Command } from "../types/discord/command";
import { util }    from "../util";

const bot : Discord.Client = new Discord.Client();
const cmds: Discord.Collection<string, Command> 
                           = new Discord.Collection();

bot.once("ready", () => {
  util.discordLog("logged in");

  const files = fs.readdirSync(`./dist/modules/discord/cmd`)
                  .filter((f) => f.endsWith(".js"));
  for (const f of files) {
      const cmd = require(`./discord/cmd/${f.replace(".js", "")}`);
      cmds.set(cmd.prop.name, cmd);
  };
  util.discordLog(`${cmds.array().length} command(s) loaded`);

  bot.user.setActivity("on amethyst.host", {type: "PLAYING"});
});

bot.on("message", async (msg: Discord.Message) => {
  if (!msg.content.startsWith(config.discord.prefix)
    || msg.author.bot) return;

  const args: Array<string> = msg.content.split(" ");
  const cmd : string        = args[0].substring(config.discord.prefix.length).toLowerCase();

  // remove the command argument
  args.shift();

  try {
    cmds.get(cmd).prop.run(bot, msg, args, cmds);
    util.discordLog(`executed ${cmd} [${args}]`);
  } catch (e) {
    util.discordLog(`not executed (${e})`);
  }
});

bot.login(process.env.TOKEN);

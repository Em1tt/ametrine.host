// discord bot
//import "dotenv/config";
import dotenv      from "dotenv" // annoying
import Discord     from "discord.js";
import fs          from "fs";
import config      from "../config.json";
import { Command } from "../types/discord/command";
import util        from "../util";
dotenv.config({ path: __dirname + "/../../.env" })

const bot : Discord.Client = new Discord.Client({ intents: [Discord.Intents.FLAGS.GUILDS] });
const cmds: Discord.Collection<string, Command> 
                           = new Discord.Collection();

bot.once("ready", () => {
  console.log("logged in");

  const files = fs.readdirSync(`./modules/discord/cmd`)
                  .filter((f) => f.endsWith(".js"));
  for (const f of files) {
      const cmd: Command = require(`./discord/cmd/${f.replace(".js", "")}`);
      cmds.set(cmd.prop.name, cmd);
  }
  console.log(`${[...cmds.values()].length} command(s) loaded`);

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
    console.log(`executed ${cmd} [${args}]`);
  } catch (e) {
    console.log(`not executed (${e})`);
  }
});

bot.login(process.env.TOKEN);

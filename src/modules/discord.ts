// discord bot!!
// i will let @Em1t do all the fancy ts stuff here
import "dotenv/config";
import Discord  from "discord.js";
import Command  from "types/command.d.ts";
import { util } from "../util";

const bot = new Discord.Client();

bot.on("ready", () => {
  util.discordLog("logged in");
});

bot.login(process.env.TOKEN);

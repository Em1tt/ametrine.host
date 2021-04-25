// ping command
// should just write "pong"
import { Command } from "../../../types/discord/command";
export const ping: Command = {
  name : "ping",
  desc : "Check if the bot is alive.",
  usage: "ping",

  run: (bot, msg, args) => msg.reply("Pong!");
}

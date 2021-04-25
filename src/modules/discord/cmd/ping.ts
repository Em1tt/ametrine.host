// ping command
// should just write "pong"
import { Command } from "../../../types/discord/command";
import { Client, Message } from "discord.js";
export const prop = {
  name : "ping",
  desc : "Check if the bot is alive.",
  usage: "ping",

  run: (bot: Client, 
        msg: Message, 
        args: Array<string>) => msg.reply("Pong!")
}

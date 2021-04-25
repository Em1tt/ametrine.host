// ping command
// should just write "pong"
import { Client, Message } from "discord.js";

export const prop = {
  name : "ping",
  desc : "Check if the bot is alive.",
  usage: "ping",

  run: (bot : Client, 
        msg : Message): void => { msg.reply("Pong!") }
}

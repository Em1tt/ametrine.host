// help command
import { Client, Message, Collection } from "discord.js";
import { Command } from "../../../types/discord/command";

export const prop = {
  name : "help",
  desc : "See help on some command.",
  usage: "help [command]",

  run: (bot : Client, 
        msg : Message,
        args: Array<string>,
        cmds: Collection<string, Command>): void => {
    const cmd: Command = cmds.get(args[0]);

    // See help on some command. (`help [command]`)
    msg.reply(`${cmd.prop.desc} (\`${cmd.prop.usage}\`)`);
  }
}

// help command
import { Client, Message, Collection, MessageEmbed } from "discord.js";
import { Command } from "../../../types/discord/command";
import config from "../../../config.json";

export const prop = {
  name: "help",
  desc: "See help on some command.",
  usage: "help [command]",
  category: "User",
  permissions: [""],

  run: (bot: Client,
        msg: Message,
       args: Array<string>,
       cmds: Collection<string, Command>): void => {
    // display all commands
    if (args.length == 0) {
      const categories: Array<string> = [],
        helpEmbed: MessageEmbed = new MessageEmbed();

      helpEmbed.setTitle("Help command")
        .setColor(config.discord.amethyst)
        .setDescription(`My prefix is \`${config.discord.prefix}\` | Do \`${config.discord.prefix}help <command>\` to get detailed help for a certain command.`);
      cmds.forEach(cmd => {
        if (cmd.prop.category in categories) return;
        categories.push(cmd.prop.category);
      });
      console.log(categories);
      categories.forEach(cat => {
        helpEmbed.addField(cat, `${cmds.filter(cmd => cmd.prop.category == cat).map(c => `\`${c.prop.name}\` `)}`);
      });
      msg.channel.send(helpEmbed);
    } else {
      const cmd: Command = cmds.get(args[0]);
      msg.reply(`**${cmd.prop.name}**\n${cmd.prop.desc}\n\nCategory: **${cmd.prop.category}**\nUsage: \`${cmd.prop.usage}\``);
    }
  }
}
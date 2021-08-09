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

    if (args.length == 0 || !cmds.get(args[0])) {
      // Display all commands if there's no args found or the argument doesn't match any command.
      //Create constants for categories and embed
      const categories: Array<string> = [],
            helpEmbed : MessageEmbed = new MessageEmbed();
      //Customize the embed for basic needs
      helpEmbed.setTitle("Help command")
        .setColor(config.discord.amethyst)
        .setDescription(`My prefix is \`${config.discord.prefix}\` | Do \`${config.discord.prefix}help <command>\` to get detailed help for a certain command.`);
      //Run a check for each command, detect all categories and store unique categories in categories array | Creates a list of categories available
      cmds.forEach(cmd => {
        //If category is already in categories array, ignore.
        if (cmd.prop.category in categories) return;
        //Push new category into the categories array
        categories.push(cmd.prop.category);
      });
      //For each category create an embed field
      categories.forEach(cat => {
        //Create a field with the name of category and the value of all commands inside that category
        helpEmbed.addField(cat, `${cmds.filter(cmd => cmd.prop.category == cat).map(c => `\`${c.prop.name}\` `)}`);
      });
      //Add a verbose warning to tell the user the command they tried to get info of doesn't exist.
      if(args.length != 0) helpEmbed.description += `\n\n> Couldn't find the command \`${args[0]}\`. Check for typos, and make sure the command exists.`;

      //Send the embed
      msg.channel.send({embeds: [helpEmbed]});
    } else {
      //If there is an argument, try finding it from between the commands and give information about it.
      //Get the command requested - We know this exists due to the first condition of this if else statement.
      const cmd: Command = cmds.get(args[0]),
      //Create an embed
      helpCommandEmbed: MessageEmbed = new MessageEmbed();

      //Fill the embed out with information
      helpCommandEmbed.setTitle(`Help command - ${cmd.prop.name}`)
      .setColor(config.discord.amethyst)
      .setDescription(`${cmd.prop.desc}\n**Usage:** ${cmd.prop.usage}`)
      .addField("Category", cmd.prop.category, true);

      //If command requires permissions, create a field with the required permissions.
      if(cmd.prop.permissions.length != 0) helpCommandEmbed.addField("Permissions required", cmd.prop.permissions.flat().join(" "));

      msg.channel.send({ embeds: [helpCommandEmbed]});
    }
  }
}
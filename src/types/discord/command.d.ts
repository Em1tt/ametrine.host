// bot command, like !ping
import { Client, Message } from "discord.js";

export type Command = {
  name  : string;
  desc? : string;
  usage?: string;
  run   : (
           bot: Client, 
           msg: Message, 
           args: Array<string>
          ) => void;
}

// bot command, like !ping
import { Client, Message } from "discord.js";

export interface Command {
  prop: {
    readonly name  : string;
    readonly desc? : string;
    readonly usage?: string;
    run            : (bot : Client,
                      msg : Message,
                      args: Array<string>)
                         => void;
  };
}

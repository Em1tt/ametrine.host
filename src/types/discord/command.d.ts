// bot command, like !ping
import { Client, Message, Collection } from "discord.js";

export interface Command {
  prop: {
    readonly name    : string;
    readonly desc    : string;
    readonly usage   : string;
    readonly category: string;
    readonly permissions: Array<string>;

    run              : (bot : Client,
                        msg : Message,
                        args: Array<string>,
                        cmds: Collection<string, Command>)
                           => void;
  };
}

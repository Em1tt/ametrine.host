// entry point file that gets started with the start script
// NOTE: to run with args, use `npm run start -- --arg`
// imports
import "dotenv/config";
import path          from "path";
import fs            from "fs";
import child_process from "child_process";
import readline      from "readline";

// files
import { util } from "./util";
import { cmds } from "./cli";
import config   from "./config.json";

// variables
const strings   : any    = require(`./lang/${config.lang}.json`),
      modulePath: string = path.join(__dirname, config.folder),
      modules   : Map<string, child_process.ChildProcess> = new Map(),
      moduleList: any    = require(`./${config.folder}/modules.json`);

for (const file of moduleList) {
  modules.set(file.name,
              child_process.spawn(`node ${file.file}`));
}

util.log(util.sreplace(strings.start, [modules.size]));

// "CLI"
const CLI = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
CLI.on("line", (input) => {
  const args: Array<string> = input.toString().trim().split(" ");
  const cmd : string        = args[0];
  args.shift();

  cmds[cmd](modules, args);
});

process.once("SIGINT", () => {
  modules.forEach((m) => m.kill());
  process.exit(0); // close nodejs
});

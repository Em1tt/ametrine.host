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
const strings    : any    = require(`./lang/${config.lang}.json`),
      MODULE_PATH: string = path.join(__dirname, "modules"),
      modules    : Map<string, child_process.ChildProcess> = new Map(),

// preload & start all modules
      mfiles: Array<string> = fs.readdirSync(MODULE_PATH)
                                .filter((f) => f.endsWith(".js"));

for (const file of mfiles) {
  modules.set(file.replace(".js", ""),
              child_process.fork(`dist/modules/${file}`));
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
})

process.once("SIGINT", () => {
  modules.forEach((m) => m.kill());
  process.exit(0); // close nodejs
});

// entry point file that gets started with the start script
// NOTE: to run with args, use `npm run start -- --arg`
// imports
import "dotenv/config";
import path          from "path";
import fs            from "fs";
import child_process from "child_process";

// files
import { util } from "./util";
import { cmds } from "./cli";

// variables
const MODULE_PATH: string = path.join(__dirname, "modules");
const stdin      : any    = process.openStdin();
const modules    : Map<string, child_process.ChildProcess> = new Map();

// preload & start all modules
const mfiles: Array<string> = fs.readdirSync(MODULE_PATH)
                                .filter((f) => f.endsWith(".js"));

for (const file of mfiles) {
  modules.set(file.replace(".js", ""),
              child_process.fork(`dist/modules/${file}`));
}
util.log(`${modules.size} module(s) started`);

// "CLI"
stdin.addListener("data", (d) => {
  const args: Array<string> = d.toString().trim().split(" ");
  const cmd : string        = args[0];
  args.shift();

  cmds[cmd](modules, args);
});

process.once("SIGINT", () => {
  modules.forEach((m) => m.disconnect());
  process.exit(0); // close nodejs
});

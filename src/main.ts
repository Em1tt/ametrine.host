// entry point file that gets started with the start script
// NOTE: to run with args, use `npm run start -- --arg`
// imports
import "dotenv/config";
import path          from "path";
import fs            from "fs";
import child_process from "child_process";
import Mod           from "./types/module";

// files
import config   from "./config.json";
import { util } from "./util";

// variables
const MODULE_PATH: string = path.join(__dirname, "modules");
let moduleNames: Array<any> = [];
let modules    : Array<any> = [];

// preload all modules
fs.readdirSync(MODULE_PATH).forEach((file) => {
  if (!file.endsWith(".js")) return;
  moduleNames.push(file.replace(".js", ""));
});
console.log(`[main] ${moduleNames.length} module(s) loaded`);

// start all modules in separate processes
for (let m of moduleNames) {
  let i = child_process.fork(`dist/modules/${m}.js`);
  modules.push(i);
};

process.on("SIGINT", () => {
  // stop every module
  for (let m of modules) { m.disconnect() }

  // close nodejs
  process.exit(0);
});

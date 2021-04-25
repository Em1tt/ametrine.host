// entry point file that gets started with the start script
// NOTE: to run with args, use `npm run start -- --arg`
// imports
import "dotenv/config";
import path          from "path";
import fs            from "fs";
import child_process from "child_process";

// files
import { util } from "./util";

// variables
const MODULE_PATH: string = path.join(__dirname, "modules");
const moduleNames: Array<string> = [];
const modules    : Array<object> = [];

// preload all modules
fs.readdirSync(MODULE_PATH).forEach((file) => {
  if (!file.endsWith(".js")) return;
  moduleNames.push(file.replace(".js", ""));
});

util.log(`${moduleNames.length} module(s) loaded`);

// start all modules in separate processes
moduleNames.forEach((m) => {
  modules.push(
    child_process.fork(`dist/modules/${m}.js`)
  );
});

process.on("SIGINT", () => {
  modules.forEach((m) => m.disconnect()); // stop modules
  process.exit(0); // close nodejs
});

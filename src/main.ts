// entry point file that gets started with the start script
// NOTE: to run with args, use `npm run start -- --arg`
// imports
import "dotenv/config";
import path          from "path";
import fs            from "fs";
import child_process from "child_process";
import Module        from "./types/module";

// files
import config   from "./config.json";
import { util } from "./util";

// variables
const MODULE_PATH: string = path.join(__dirname, "modules");
let modules: Module[];

// preload all modules
fs.readdir(MODULE_PATH, (e, f) => {
  if (e) throw new Error(e);
  f.forEach((file) => modules.push(import(file)));
});

// start all modules in separate processes
modules.forEach((m) => {
  child_process.spawn(process.argv[0], [m], {
    detached: true // make it independent
  });
});

process.on("SIGINT", () => {
  // stop every module
  modules.forEach((m) => m.stop());

  // close nodejs
  process.exit(0);
});

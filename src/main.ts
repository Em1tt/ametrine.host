// entry point file that gets started with the start script
// NOTE: to run with args, use `npm run start -- --arg`
// imports
import "dotenv/config";
import fs from "fs";
import Module from "./types/module";

// files
import config   from "./config.json";
import { util } from "./util";

// variables
let modules: Module[];

// preload all modules & start them


process.on("SIGINT", () => {
  // stop every module
  for (let m of modules) { m.stop() }

  // close nodejs
  process.exit(0);
});

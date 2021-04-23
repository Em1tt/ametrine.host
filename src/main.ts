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

// preload all modules


process.on("SIGINT", () => {
  // stop http server
  server.close(() => {
    util.expressLog(`http server stopped`)
  });

  // have to do this because nodejs hangs otherwise (could have done it with if (...) return)
  if (!process.argv.includes("--no-redis")) {
    // disconnect redis client
    db.client.quit();
    util.redisLog(`client disconnected`);
    // stop redis server
    db.server.close((e) => {
      util.redisLog(`server closed`)
    });
  }

  // close nodejs
  process.exit(0);
});

// entry point file that gets started with the start script
// NOTE: to run with args, use `npm run start -- --arg`
// imports
import "dotenv/config";
import path          from "path";
import fs            from "fs";
import child_process from "child_process";
import stream        from "stream";

// files
import { util } from "./util";

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

  // ..yeah, thats stupid
  switch (cmd) {
    case "disable":
      if (args[0] == "*") {
        modules.forEach((m) => m.kill());
        return util.log("disabled all modules");
      }
      if (!modules.has(args[0]))
        return util.log(`unknown module "${args[0]}"`);

      modules.get   (args[0]).kill();
      modules.delete(args[0]);
      util.log(`disabled module "${args[0]}"`);
      break;

    case "enable":
      if (modules.has(args[0]))
        return util.log(`module "${args[0]}" already enabled`);

      modules.set(args[0],
                  child_process.fork(`dist/modules/${args[0]}.js`));
      util.log(`loaded module "${args[0]}"`)
      break;

    case "usage":
      util.log(`${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB`);
      break;

    default: util.log("unknown command!");
  }
});

process.on("SIGINT", () => {
  modules.forEach((m) => m.disconnect());
  process.exit(0); // close nodejs
});

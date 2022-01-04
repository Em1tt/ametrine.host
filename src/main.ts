// entry point file that gets started with the start script
// NOTE: to run with args, use `npm run start -- --arg`
// imports
import path     from "path";
import cp       from "child_process";
import readline from "readline";

// files
import util   from "./util";
import cmds   from "./cli";
import config from "./config.json";

// variables
const modulePath: string = path.join(__dirname, config.modules),
      modules   : Map<string, cp.ChildProcess> = new Map(),
      moduleList: any    = require(`./${config.modules}/modules.json`);

for (const file of moduleList) {
  const mpath = path.join(__dirname, 
                          config.modules,
                          file.file);

  modules.set(file.name,
    cp.spawn(
      // this is really dirty
      "command",
      [
        (file.kind === "bin" ? `./${mpath}` : "node"),
        (file.kind === "bin" ? "" : mpath)
      ],
      {
        stdio: ["ignore", "pipe", "pipe", "ipc"]
      }
    )
  );

  const m = modules.get(file.name);

  // handle module stdout
  m.stdout.setEncoding("utf8");
  m.stdout.on("data", (d) => {
    console.log(`\u001b[38;5;${file.colour}m[${file.name}] ${d.toString()}`);
  });

  // handle module stderr
  m.stderr.setEncoding("utf8");
  m.stderr.on("data", (d) => {
    console.error(`!!! [${file.name}] ${d.toString()}`);
  });
}

util.log(util.sreplace("%0% modules started", [modules.size]));

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
  console.log("\u001b[0m"); // reset colour
  process.exit(0); // close nodejs
});


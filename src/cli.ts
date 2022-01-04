// all cli commands
import cp     from "child_process";
import config from "./config.json";
import util   from "./util";

export default {
  disable: (modules: Map<string, cp.ChildProcess>, args: Array<string>): void => {
      if (args[0] == "*") {
        modules.forEach((m) => {
          m.kill();
        });
        modules.clear();
        return util.log("disabled all modules");
      }
      if (!modules.has(args[0]))
        return util.log(util.sreplace("unknown module %0%", [args[0]]));

      modules.get   (args[0]).kill();
      modules.delete(args[0]);
      util.log(util.sreplace("disabled module %0%", [args[0]]));
  },

  enable: (modules: Map<string, cp.ChildProcess>, args: Array<string>): void => {
      if (modules.has(args[0]))
        return util.log(util.sreplace("module %0% is already loaded", [args[0]]));

      modules.set(args[0],
                  cp.fork(`dist/${config.folder}/${args[0]}.js`));
      util.log(util.sreplace("loaded module %0%", [args[0]]));
  },

  usage: (): void => util.log(util.sreplace("%0%MB", [(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)])),

  bash: (_: any, args: Array<string>) => {
    cp.exec(args.join(" "), (e, out, err) => {
      if (e) return util.error(`node: ${e}`);
      if (err) util.error(`bash: ${err}`);

      util.log(out != "" ? out : "CLI: success");
    });
  },

  exit: (modules: Map<string, cp.ChildProcess>): void => {
    modules.forEach((m) => m.kill());
    console.log("\u001b[0m\n"); // reset colour
    process.exit(0);
  }
}


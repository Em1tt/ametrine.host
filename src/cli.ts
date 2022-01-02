// all cli commands
import child_process from "child_process";
import config        from "./config.json";
import { util }      from "./util";

export const cmds = {
  disable: (modules: Map<string, child_process.ChildProcess>, args: Array<string>): void => {
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

  enable: (modules: Map<string, child_process.ChildProcess>, args: Array<string>): void => {
      if (modules.has(args[0]))
        return util.log(util.sreplace("module %0% is already loaded", [args[0]]));

      modules.set(args[0],
                  child_process.fork(`dist/${config.folder}/${args[0]}.js`));
      util.log(util.sreplace("loaded module %0%", [args[0]]));
  },

  usage: (): void => util.log(util.sreplace("%0%MB", [(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)]))
};

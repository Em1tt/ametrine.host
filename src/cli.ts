// all cli commands
import child_process from "child_process";
import config        from "./config.json";
import { util }      from "./util";
const s: any = require(`./lang/${config.lang}.json`);

export const cmds = {
  disable: (modules: Map<string, child_process.ChildProcess>, args: Array<string>): void => {
      if (args[0] == "*") {
        modules.forEach((m) => {
          m.kill();
        });
        modules.clear();
        return util.log(s.modules.disabledAll);
      }
      if (!modules.has(args[0]))
        return util.log(util.sreplace(s.modules.unknown, [args[0]]));

      modules.get   (args[0]).kill();
      modules.delete(args[0]);
      util.log(util.sreplace(s.modules.disable, [args[0]]));
  },

  enable: (modules: Map<string, child_process.ChildProcess>, args: Array<string>): void => {
      if (modules.has(args[0]))
        return util.log(util.sreplace(s.modules.alreadyLoaded, [args[0]]));

      modules.set(args[0],
                  child_process.fork(`dist/modules/${args[0]}.js`));
      util.log(util.sreplace(s.modules.load, [args[0]]));
  },

  usage: (): void => util.log(util.sreplace(s.modules.usage, [(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)]))
};

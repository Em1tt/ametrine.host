// all cli commands
import child_process from "child_process";
import { util }      from "./util";

export const cmds = {
  disable: (modules: Map<string, child_process.ChildProcess>, args: Array<string>): void => {
      if (args[0] == "*") {
        modules.forEach((m) => m.kill());
        return util.log("disabled all modules");
      }
      if (!modules.has(args[0]))
        return util.log(`unknown module "${args[0]}"`);

      modules.get   (args[0]).kill();
      modules.delete(args[0]);
      util.log(`disabled module "${args[0]}"`);
  },

  enable: (modules: Map<string, child_process.ChildProcess>, args: Array<string>): void => {
      if (modules.has(args[0]))
        return util.log(`module "${args[0]}" already enabled`);

      modules.set(args[0],
                  child_process.fork(`dist/modules/${args[0]}.js`));
      util.log(`loaded module ${args[0]}`);
  },

  usage: (): void => util.log(`${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB`)
};

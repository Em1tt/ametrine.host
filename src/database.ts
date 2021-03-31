// database code for all redis stuff
import { util }    from "./util";
import config      from "./config.json";
import fs          from "fs";
import redis       from "redis";
import RedisServer from "redis-server";

let c: redis.RedisClient = redis.createClient({port: config.db.port})
let s: any = new RedisServer(config.db.port);



export let db = {
  init: () => {
    // start the server
    /*s.open((e) => {
      if (e) throw e;
      util.redisLog(`server ready @${config.db.port}`);
    });*/

    c.on("ready", () => util.redisLog(`client ready @${config.db.port}`));
    c.on("error", (e) => {throw e});

  },

  client: c,
  server: s
}

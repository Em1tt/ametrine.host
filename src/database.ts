// database code for all sql stuff
import { util } from "./util";
import fs       from "fs";
import Sqlite = require("better-sqlite3");

const db: Sqlite.Database = new Sqlite("../db/all.db", {
  verbose: util.sqlLog
});
let initCode: string = "";

export let sql = {
  init: function (): void {
    // get sql code to execute on start
    fs.readFile("./sql/init.sql", (e, data) => {
      if (e) throw e;
      initCode = data.toString();
    });
    db.exec(initCode);
  },

  database: db
}

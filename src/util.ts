// util functions
export const util = {
  // log out sql data
  redisLog: function (text: string): void {
    if (!process.argv.includes("--no-log"))
      console.log(`[redis] ${text}`);
  },
  // log out express data
  expressLog: function (text: string): void {
    if (!process.argv.includes("--no-log"))
      console.log(`[express] ${text}`);
  }
};

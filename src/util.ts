// util functions
export const util = {
  // log out general data
  log: function (text: string): void {
    console.log(`[amethyst]\t${text}`);
  },
  // log out database data
  redisLog: function (text: string): void {
    console.log(`[redis]\t${text}`);
  },
  // log out express data
  expressLog: function (text: string): void {
    console.log(`[express]\t${text}`);
  },
  // log out discord data
  discordLog: function (text: string): void {
    console.log(`[discord]\t${text}`);
  }
};

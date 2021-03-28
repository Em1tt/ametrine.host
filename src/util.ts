// util functions
export const util = {
  // log out sql data
  sqlLog: function (text: any): void {
    console.log(`[sql] ${text}`);
  },
  // log out express data
  expressLog: function (text: any): void {
    console.log(`[express] ${text}`);
  }
};

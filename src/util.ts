// util functions
export const util = {
  sreplace: (text: string, rep: Array<any>): string => {
    for (let i = 0; i < rep.length; i ++) {
      text = text.replace(new RegExp(`%${i}%`, "g"), rep[i]);
    }
    return text;
  },

  log       : (text: string): void => console.log(`[backend] ${text}`),
  expressLog: (text: string): void => console.log(`[website] ${text}` ),
  discordLog: (text: string): void => console.log(`[discord] ${text}` ),
  mailLog   : (text: string): void => console.log(`[mailbox] ${text}` )
};

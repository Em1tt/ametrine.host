// util functions
export const util = {
  sreplace: (text: string, rep: Array<any>): string => {
    // i know its stupid, i know its dumb,
    // but thats the only solution that comes in my head!!
    // whatcha gonna do about that? huh???????
    // - b1tt, 17 May 2021

    for (let i = 0; i < 9; i ++) {
      text.includes(`{${i}}`) ?
          text.replace(new RegExp(`%${i}%`, "g"), rep[i]) :
          null;
    }

    return text;
  },

  log:        (text: string): void => console.log(`[backend] ${text}`),
  expressLog: (text: string): void => console.log(`[website] ${text}` ),
  discordLog: (text: string): void => console.log(`[discord] ${text}` ),
  mailLog:    (text: string): void => console.log(`[mailbox] ${text}` )
};

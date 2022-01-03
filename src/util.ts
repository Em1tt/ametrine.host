// util functions
export default {
  sreplace: (text: string, rep: Array<any>): string => {
    for (let i = 0; i < rep.length; i ++) {
      text = text.replace(new RegExp(`%${i}%`, "g"), rep[i]);
    }
    return text;
  },

  log: (text: string): void => console.log(`[ametrine] ${text}`),
};

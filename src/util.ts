// util functions
export const util = {
  log:        (text: string) => console.log(`[amethyst]\t${text}`),
  expressLog: (text: string) => console.log(`[website]\t${text}`),
  discordLog: (text: string) => console.log(`[discord]\t${text}`),
  mailLog:    (text: string) => console.log(`[mailbox]\t${text}`)
};

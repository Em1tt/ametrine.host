// util functions
export const util = {
  log:        (text: string): void => console.log(`[amethyst]\t${text}`),
  expressLog: (text: string): void => console.log(`[website]\t${text}` ),
  discordLog: (text: string): void => console.log(`[discord]\t${text}` ),
  mailLog:    (text: string): void => console.log(`[mailbox]\t${text}` )
};

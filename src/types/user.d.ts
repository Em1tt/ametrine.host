// user account type

export type User = {
  name   : string;          // user name
  id     : number;          // user id
  servers: import("./server").Server[] | null; // servers that the user owns
}

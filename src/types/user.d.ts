import Server from "server";
// user account type

export type User = {
  name   : string;          // user name
  id     : number;          // user id
  servers: Server[] | null; // servers that the user owns
}

// user account type
import { Server } from "./server";
export type User = {
  name    : string;
  id      : number;
  servers?: Array<Server>;
}

// user server type

export type Server = {
  name : string; // server name
  id   : number; // server id in the database
  owner: number; // server owner id
  price: number; // how much is charged per month
  ip   : string; // server ip
}

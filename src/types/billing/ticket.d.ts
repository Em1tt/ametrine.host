export interface Ticket {
      readonly ticket_id    : number;
      readonly user_id      : number;
      readonly subject      : string;
      readonly content      : string;
      readonly level        : number;
      readonly category_ids : string;
      readonly opened       : Date;
      readonly closed       : Date;
  }
  
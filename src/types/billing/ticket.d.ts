export interface Ticket {
      readonly ticket_id    : number;
      readonly user_id      : number;
      subject               : string;
      content               : string;
      readonly status       : string | number;
      readonly category_ids : string;
      readonly level        : number;
      opened                : number | Date;
      closed                : number | Date;
      files                 : Array<string> | number;
      createdIn             : number | Date;
      editedIn              : number | Date;
      priority              : string;
      key                   : string;
}

export interface Message {
      readonly msg_id    : number;
      readonly ticket_id    : number;
      readonly user_id    : number;
      readonly createdIn    : number;
      readonly editedIn    : number;
      
}
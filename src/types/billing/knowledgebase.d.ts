export interface Article {
    readonly article_id    : number;
    readonly user_id      : number;
    header                : string;
    content               : string;
    readonly status       : string | number;
    readonly category_ids : string;
    readonly level        : number;
    likes                 : number;
    dislikes              : number;
    files                 : Array<string> | number;
    createdIn             : number | Date;
    editedIn              : number | Date;
    key                   : string;
}

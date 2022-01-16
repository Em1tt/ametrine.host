export interface Article {
    readonly article_id   : number;
    readonly user_id      : number;
    readonly permission_id: number;
    header                : string;
    content               : string;
    readonly state        : string | number;
    readonly category_ids : string;
    likes                 : number;
    dislikes              : number;
    files                 : Array<string> | number;
    createdIn             : number | Date;
    editedIn              : number | Date;
}

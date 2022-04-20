export interface Article {
    readonly article_id   : number;
    readonly user_id      : number;
    readonly permission_id: number;
    header                : string;
    content               : string;
    readonly state        : number | 0 | 1 | 2;
    readonly category_ids : string;
    readonly tags         : string;
    likes                 : string | number | Array<number>;
    dislikes              : string | number | Array<number>;
    files                 : Array<string> | number;
    createdIn             : number | Date;
    editedIn              : number | Date;
}

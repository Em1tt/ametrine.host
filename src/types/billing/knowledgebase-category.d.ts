export interface knowledgebase_category {
    readonly id                 : string | number;
    readonly name               : string;
    readonly description        : string;
    readonly minimum_permission : string | number;
    readonly color              : string;
}
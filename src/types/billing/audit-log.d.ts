export interface AuditLog {
    readonly userID     : number;
    readonly page       : string;
    readonly method     : string;
    readonly body       : object;
}

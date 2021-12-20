export interface UserData {
    registered: any;
    readonly refreshToken   : string;
    readonly accessToken    : string;
    readonly user_id        : string | number;
    readonly name           : string;
    readonly email          : string;
    readonly permission_id  : string | number;
    readonly "2fa"          : number;
}

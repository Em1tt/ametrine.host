export interface UserData {
    readonly refreshToken   : string;
    readonly accessToken    : string;
    readonly user_id        : number;
    readonly name           : string;
    readonly email          : string;
    readonly permission_id  : unknown;
}

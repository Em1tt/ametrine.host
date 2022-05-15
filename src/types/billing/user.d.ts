export interface UserData {
    readonly registered     : number | Date;
    readonly refreshToken   : string;
    readonly accessToken    : string;
    readonly user_id        : string | number;
    readonly name           : string;
    readonly email          : string;
    readonly permission_id  : string | number;
    readonly "2fa"          : number;
    readonly state          : number;
    readonly discord_user_id: string | number;
}

// User State IDs //
/**
 * 0 > Unverified (Hasn't verified email)
 * 1 > Verified (Verified email)
 * 2 > Deleting (In the process of being deleted)
 * 3 > Disabled (Cannot login)
 * 4 > Terminated (Could also be in the process of being terminated)
 */

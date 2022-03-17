export interface Redis {
    // For some reason typescript is ignoring redis types exists, so I have to define them manually
    incr: (key: string, callback?: any) => void,
    del: (key: string, callback?: any) => void,
    keys: (key: string, callback?: any) => void,
    hdel: (key: string, field: string | number, callback?: any) => void,
    expire: (key: string, field: string | number, callback?: any) => void,
    persist: (key: string, callback?: any) => void,
    db: {
        get: (key: string) => Promise<any>,
        hget: (key: string, field: string | number) => Promise<any>,
        hmget: (key: string, fields: Array<string | number>) => Promise<any>
        incr: (key: string) => Promise<number | null>,
        hgetall: (key: string) => Promise<any>,
        hexists: (key: string ,field: string) => Promise<number | boolean>,
        exists: (key: string) => Promise<number | boolean>,
        hset: (values: Array<any>) => Promise<any>
    },
    JWToptions: {
        RTOptions: {
            expiresIn: number
        },
        RTOptionsRemember: {
            expiresIn: number
        },
        ATOptions: {
            expiresIn: number
        }
    }
}  
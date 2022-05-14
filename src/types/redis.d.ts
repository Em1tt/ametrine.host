//export type DBCallback = Promise<number | string>;
export type DBCallback = Promise<any>
export type RedisCallback = any;

export interface Redis {
    // For some reason typescript is ignoring redis types exists, so I have to define them manually
    incr: (key: string, callback?: RedisCallback) => void,
    del: (key: string, callback?: RedisCallback) => void,
    keys: (key: string, callback?: RedisCallback) => void,
    hdel: (key: string, field: string | number, callback?: RedisCallback) => void,
    expire: (key: string, field: string | number, callback?: RedisCallback) => void,
    persist: (key: string, callback?: RedisCallback) => void,
    zmscore: (key: string, field: string | number, callback?: RedisCallback) => void,
    db: {
        get: (key: string) => DBCallback,
        hget: (key: string, field: string | number) => DBCallback,
        hmget: (key: string, fields: Array<string | number>) => DBCallback
        incr: (key: string) => DBCallback,
        hgetall: (key: string) => Promise<any>,
        hexists: (key: string, field: string) => DBCallback,
        exists: (key: string) => DBCallback,
        hset: (values: Array<any>) => DBCallback
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
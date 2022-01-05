export interface Redis {
    // For some reason typescript is ignoring redis types exists, so I have to define them manually
    incr: (key: string, callback: any) => void,
    db: {
        get: (key: string) => Promise<string | number | null>,
        hget: (key: string, field: string | number) => Promise<string | number | null>,
        hmget: (key: string, fields: Array<string | number>) => Promise<string | number | null>
        incr: (key: string) => Promise<number | null>,
        hgetall: (key: string) => Promise<any>,
        hexists: (key: string ,field: string) => Promise<number | boolean>,
        exists: (key: string) => Promise<number | boolean>,
        hset: (values: Array<string | number>) => Promise<any>
    }
}  
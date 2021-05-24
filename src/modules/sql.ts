import Database from 'better-sqlite3';

import ms       from 'ms';
export const sql = {
    db: new Database('./data/db/database.db', { verbose: console.log }),
    jwtOptions: {
        expiresIn: ms('90 days'),
        issuer: "Amethyst Host (1.0)"
    }
}

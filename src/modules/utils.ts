import express from 'express';
export const utils = {
    allowedMethod: (req: express.Request, res: express.Response, type: Array<string>): boolean => { // I should probably turn this into a global function instead of copying & pasting all over the place.
        res.set("Allow", type.join(", "));
        if (!type.includes(req.method)) {
            res.sendStatus(405);
            return false;
        }
        return true;
    },
    encode_base64: (str: string): boolean | string => {
        if (!str.length) return false;
        return btoa(encodeURIComponent(str));
    },
    decode_base64: (str: string): boolean |  string => {
        if (!str.length) return false;
        return decodeURIComponent(atob(str));
    }
};

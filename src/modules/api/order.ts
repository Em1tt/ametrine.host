/**
 * API for ordering a service at Ametrine.Host
 */
import express                 from 'express';
import { sql }                 from '../sql';
import { auth }                from './auth';

export const prop = {
    name: "order",
    desc: "API for ordering a service",
    run: async (req: express.Request, res: express.Response): Promise<any> => {
        const allowedMethods = ["GET", "POST"];
        res.set("Allow", allowedMethods.join(", ")); // To give the method of whats allowed
        if (!allowedMethods.includes(req.method)) return res.sendStatus(405);
        const params = req.params[0].split("/").slice(1);
        let userData = await auth.verifyToken(req, res, false, "both");
        if (userData == 101) {
            const newAccessToken = await auth.regenAccessToken(req, res);
            if (typeof newAccessToken != "string") return false;
            userData = await auth.verifyToken(req, res, false, "both")
        }
        if (typeof userData != "object") return res.sendStatus(userData);
        const paramName = params[0]
        switch (paramName) {
            case "checkout": { // Currently not finished
                break;
            }
            case "coupon": {
                res.set("Allow", "GET");
                if (req.method != "GET") return res.sendStatus(405);
                const { code } = req.query;
                if (!code) return res.sendStatus(406);
                const coupon = sql.db.prepare('SELECT coupon_name, value, forever FROM coupons WHERE coupon_name = ?').get(escape(code.toString()));
                if (!coupon) return res.status(403).send("Coupon invalid or expired")
                return res.status(200).json(coupon)
            }
            default: return res.sendStatus(404);
        }
    }
}
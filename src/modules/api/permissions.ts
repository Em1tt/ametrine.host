/**
 * API for /billing/mail
*/
import express                 from 'express';
import { auth }                from './auth';
import { permissions }         from '../permissions'

// Also copying and pasting from src/modules/mailbox.ts.
export const prop = {
    name: "permissions",
    desc: "Checks whether user calling the endpoint has permissions to a defined path",
    rateLimit: {
        max: 5,
        time: 10 * 1000
    },
    run: async (req: express.Request, res: express.Response): Promise<void | boolean> => {
        let permission;
        res.set("Allow", "POST"); // To give the method of whats allowed
        if (req.method != "POST") return res.sendStatus(405) // If the request isn't a POST request, then respond with Method not Allowed.
        const userData = res.locals.userData;
        if (typeof userData != "object") {
            permission = 0;
        } else {
            permission = userData.permission_id
        }
        const {path} = req.body;
        if (!permissions.hasPermission(permission, path)) return res.status(200).json(false);
        return res.status(200).json(true);
    }
}
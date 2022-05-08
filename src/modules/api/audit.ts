/**
 * API for Showing announcements (or posting)
 */
 import express                 from 'express';
 import { permissions }         from '../permissions'
 import { auth }                from './auth';
 import { AuditLog }        from '../../types/billing/audit-log';
 import { utils }               from '../utils'
 import { Redis }               from "../../types/redis";
 let client: Redis;
 
 function paginate(array: Array<unknown>, page_size: number, page_number: number): Array<unknown> { // https://stackoverflow.com/a/42761393
    // human-readable page numbers usually start with 1, so we reduce 1 in the first argument
    return array.slice((page_number - 1) * page_size, page_number * page_size);
}

 export const prop = {
     name: "audit",
     desc: "API for Audit log",
     rateLimit: {
        max: 8,
        time: 10 * 1000
     },
     setClient: function(newClient: Redis): void { client = newClient; },
     run: async (req: express.Request, res: express.Response): Promise<unknown> => {
         if (!client) return res.status(500).send("Redis Client not available.");
         const allowedMethods = ["GET"];
         res.set("Allow", allowedMethods.join(", ")); // To give the method of whats allowed
         if (!allowedMethods.includes(req.method)) return res.sendStatus(405);
         //const params = req.params[0].split("/").slice(1);
         let userData = await auth.verifyToken(req, res, false, "both");
         if (userData == 101) {
             const newAccessToken = await auth.regenAccessToken(req, res);
             if (typeof newAccessToken != "string") return false;
             userData = await auth.verifyToken(req, res, false, "both")
         }
         if (typeof userData != "object" && req.method != "GET") return res.sendStatus(userData);
        if (!permissions.hasPermission(userData['permission_id'], `/api/audit/view`)) return res.sendStatus(403);
            let methods: string[] | string = req.query.methods ? decodeURIComponent(req.query.methods).split(",") : "";
            let userIDs: string[] | string = req.query.userIDs ? decodeURIComponent(req.query.userIDs).split(",") : ""; // Announcement Type
            const page = req.query.page || 1; // Use this to eliminate some code. (also allows me to define as constant)
            const pageLimit = req.query.pageLimit || 50;
            if (!userIDs || !userIDs.length || typeof userIDs == "string") userIDs = null;
            if (userIDs && typeof userIDs != "string" && userIDs.some(id => isNaN(parseInt(id)))) return res.status(406).send('Query "userIDs" has an invalid value.');
            if (!methods || !methods.length || userIDs == ['undefined']) methods = null;
            if(methods && typeof methods != "string" && !methods.every(method => ["GET","POST","PATCH","PUT","DELETE"].includes(method.toUpperCase()))) return res.status(406).send('Query "methods" has an invalid value.');
            if(!parseInt(page)) return res.status(406).send('Query "page" has an invalid value');
            if(!parseInt(pageLimit)) return res.status(406).send('Query "pageLimit" has an invalid value');
            let auditLogs = Object.entries(await client.db.hgetall("audit")).map(entry => {
                const obj = JSON.parse(entry[1] as any);
                obj.createdIn = JSON.parse(entry[0]);
                return obj;
            });
            auditLogs = paginate(auditLogs.filter(log => {
                if(userIDs && typeof userIDs != "string"){
                    return  userIDs.some(id => parseInt(id) == log.userID);
                }else{
                    return true;
                }
            }).filter(log => {
                if(methods && typeof methods != "string"){
                    return methods.some(method => method.toUpperCase() == log.method.toUpperCase());
                }else{
                    return true;
                }
            }).sort((a, b) => {
                return parseInt(b.createdIn) - parseInt(a.createdIn)
            }).filter(a => a != null), pageLimit, page);
            if (!auditLogs.length) return res.sendStatus(404);
            return res.status(200).json(auditLogs);
     }
 }
 
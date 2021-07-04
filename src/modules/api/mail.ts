/**
 * API for /billing/mail
*/
import express                 from 'express';
import { sql }                 from '../sql';
import { auth }                from './auth';
import { permissions }         from '../permissions'
import { mailbox }             from '../mailbox'

// copy & paste from tickets.ts
const settings = {
    maxTitle: 50, // Maximum Length for the title of the mail.
    maxBody: 2000, // Maximum Length for messages.
}
// Values taken from mail.eta

const emailRegex = /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/g

// Also copying and pasting from src/modules/mailbox.ts.
export const prop = {
    name: "mail",
    desc: "Sends a \"mail\" from /billing/mail to support@amethyst.host",
    run: async (req: express.Request, res: express.Response): Promise<any> => {
        res.set("Allow", "POST"); // To give the method of whats allowed
        if (req.method != "POST") return res.sendStatus(405) // If the request isn't a POST request, then respond with Method not Allowed.
        const userData = await auth.verifyToken(req, res, false, false);
        if (typeof userData != "object") return res.sendStatus(userData);
        if (!permissions.hasPermission(userData['permission_id'], `/mail`)) return res.sendStatus(403); // If you want anyone to be able to use the mail, comment this out.
        const { subject, content, email } = req.body;
        // May need to implement an email check to make sure the email is actually valid, for now I'll use a regex check from https://www.emailregex.com/ to determine if its the right email format. May not be a good way to check if the email is valid though.
        if (!emailRegex.test(email)) return res.status(405).send("Invalid Email.")
        const stream = {
            to: {
                text: "support@amethyst.host"
            },
            from: {
                text: email
            },
            subject: subject,
            text: content,
            attachments: [],
            date: new Date()
        }
        mailbox.receiveMail(stream, null, function(result) {
            if (result != undefined) {
                console.error(result);
                return res.sendStatus(500);
            } else {
                return res.sendStatus(201); // 201 Created
            }
        })
    }
}
  
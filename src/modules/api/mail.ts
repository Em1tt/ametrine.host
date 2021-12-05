/**
 * API for /billing/mail
*/
import express                 from 'express';
import { auth }                from './auth';
import { permissions }         from '../permissions'
import { mailbox }             from '../mailbox'

// copy & paste from tickets.ts
const settings = {
    maxTitle: 50, // Maximum Length for the title of the mail.
    maxBody: 2000, // Maximum Length for messages.
}
// Values taken from mail.eta

const emailRegex = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

// Also copying and pasting from src/modules/mailbox.ts.
export const prop = {
    name: "mail",
    desc: "Sends a \"mail\" from /billing/mail to support@amethyst.host",
    rateLimit: {
        max: 3,
        time: 60 * 1000
    },
    run: async (req: express.Request, res: express.Response): Promise<any> => {
        res.set("Allow", "POST"); // To give the method of whats allowed
        if (req.method != "POST") return res.sendStatus(405) // If the request isn't a POST request, then respond with Method not Allowed.
        let userData = await auth.verifyToken(req, res, false, "both");
        if (userData == 101) {
            const newAccessToken = await auth.regenAccessToken(req, res);
            if (typeof newAccessToken != "string") return false;
            userData = await auth.verifyToken(req, res, false, "both")
        }
        if (typeof userData != "object") return res.sendStatus(userData);
        //if (!permissions.hasPermission(userData['permission_id'], `/mail`)) return res.sendStatus(403); // If you want anyone to be able to use the mail, comment this out.
        const { subject, content, email } = req.body;
        if ([subject, content, email].includes(undefined)) return res.status(406)
                                                                     .send("Please enter in an Email, Subject, and Content");

        // May need to implement an email check to make sure the email is actually valid, for now I'll use a regex check from https://www.emailregex.com/ to determine if its the right email format. May not be a good way to check if the email is valid though.
        if (!emailRegex.test(email.toLowerCase())) return res.status(405).send("Invalid Email.")
        const stream = {
            to: {
                text: "support@amethyst.host"
            },
            from: {
                text: email.toLowerCase()
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
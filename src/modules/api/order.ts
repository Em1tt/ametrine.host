/**
 * API for ordering a service at Ametrine.Host
 */
import express                 from 'express';
import { auth }                from './auth';
const stripe                   = require('stripe')(process.env.STRIPE_SK_TEST); // This looks bad but its required.

// stripe listen --forward-to localhost:3000/api/order/webhook

let client;

export const prop = {
    name: "order",
    desc: "API for ordering a service",
    rateLimit: {
      max: 1,
      time: 30 * 1000
    },
    setClient: function(newClient) { client = newClient; },
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
        const paramName = params[0]
        if (typeof userData != "object" && paramName != "webhook") return res.sendStatus(userData);
        switch (paramName) {
            case "checkout": {
                res.set("Allow", "POST");
                if (req.method != "POST") return res.sendStatus(405);
                const session = await stripe.checkout.sessions.create({
                    customer_email: userData['email'],
                    success_url: `http://${req.get('host')}/billing/success`,
                    cancel_url: `http://${req.get('host')}/billing/cancel`,
                    payment_method_types: ['card'],
                    line_items: [
                      {price: '', quantity: 1},
                    ],
                    mode: 'subscription',
                });
                return res.redirect(303, session.url)
            }
            case "webhook": { // May switch to /api/stripe/webhook instead.
                const endpointSecret = process.env.WEBHOOK_SECRET
                const payload = req.body;
                
                const sig = req.headers['stripe-signature'];
                let event;
                try {
                    event = stripe.webhooks.constructEvent(payload, sig, endpointSecret);
                } catch (err) {
                    console.log(err.message)
                    return res.status(400).send(`Webhook Error: ${err.message}`);
                }
                switch (event.type) {
                    case 'checkout.session.completed': {
                        const session = event.data.object;
                        console.log("create order");
                        if (session.payment_status === 'paid') {
                            console.log("fulfill order (create VPS)");
                        }
                        break;
                    }
                
                    case 'checkout.session.async_payment_succeeded': {
                        const session = event.data.object;
                        console.log("fulfill order (create VPS)");
                        break;
                    }
                
                    case 'checkout.session.async_payment_failed': {
                        const session = event.data.object;
                        console.log("email customer saying to retry order");
                        break;
                    }
                  }
                return res.sendStatus(200);
            }
            case "coupon": {
                // Assuming you do these commands to create coupons
                /**
                 * INCR coupon_id 
                 * HSET coupon:(ID) coupon_id (ID) coupon_name "NAME" value 0.25 forever 0 createdIn TIMESTAMP
                 * ZADD coupons 0 (Coupon Code):(ID)
                 * 
                 */
                res.set("Allow", "GET");
                if (req.method != "GET") return res.sendStatus(405);
                let { code } = req.query;
                if (!code) return res.sendStatus(406);
                code = code.split(" ")[0]; // Making sure there are no spaces.
                return client.zmscore(`coupons`, code, async function(err, couponID) {
                    if (err) {
                        console.error(err);
                        return res.status(500).send("Error occured while searching for index in coupons. Please report this.")
                    }
                    if (!couponID) return res.status(404).send("Coupon invalid or expired")
                    const coupon = await client.db.hgetall(`coupon:${couponID}`)
                    if (!coupon) return res.status(404).send("Coupon invalid or expired")
                    
                    // Fix issues
                    coupon["coupon_id"] = parseInt(coupon["coupon_id"]);
                    coupon["forever"] = parseInt(coupon["forever"]);
                    coupon["value"] = parseInt(coupon["value"]);
                    coupon["createdIn"] = parseInt(coupon["createdIn"]);
                    
                    return res.status(200).json(coupon)
                })
            }
            default: return res.sendStatus(404);
        }
    }
}
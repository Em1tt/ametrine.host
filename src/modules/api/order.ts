/**
 * API for ordering a service at Ametrine.Host
 */
import express                 from 'express';
import { sql }                 from '../sql';
import { auth }                from './auth';
const stripe                   = require('stripe')(process.env.STRIPE_SK_TEST); // This looks bad but its required.

// stripe listen --forward-to localhost:3000/api/order/webhook

export const prop = {
    name: "order",
    desc: "API for ordering a service",
    rateLimit: {
      max: 1,
      time: 30 * 1000
    },
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
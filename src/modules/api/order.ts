/**
 * API for ordering a service at Ametrine.Host
 */
import express                 from 'express';
import { auth }                from './auth';
import { Redis }                from '../../types/redis';

const stripe                   = require('stripe')(process.env.STRIPE_SK_TEST, {
    maxNetworkRetries: 1,

}); // This looks bad but its required.

// stripe listen --forward-to localhost:3000/api/order/webhook

let client: Redis;

export const prop = {
    name: "order",
    desc: "API for ordering a service",
    rateLimit: {
      max: 10,
      time: 30 * 1000
    },
    testStripe: (req): boolean => {
        const endpointSecret = process.env.WEBHOOK_SECRET
        
        const sig = req.headers['stripe-signature'];
        const payload = req.body;
        try {
            const event = stripe.webhooks.constructEvent(payload, sig, endpointSecret);
            if (event.type) return true;
            return false;
        } catch (err) {
            //console.error(err)
            return false;
        }
    },
    setClient: function(newClient: Redis) { client = newClient; },
    run: async (req: express.Request, res: express.Response): Promise<void | boolean> => {
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
                res.set("Allow", "GET"); // Changing to POST later on
                if (req.method != "GET") return res.sendStatus(405);
                let customer;
                //? Dont know a better way to handle this.
                const customerID = await client.db.hget(`user:${userData["user_id"]}`, "customerID")
                if(!customerID || customerID == ""){
                    //create customer
                    customer = await stripe.customers.create({
                        email: userData.email,
                        name: userData.name,
                        metadata: {
                            "userID": userData["user_id"]
                        }
                    });
                    await client.db.hset([`user:${userData["user_id"]}`, "customerID", customer.id]);
                }/*else{
                    //?UNCOMMENT IF YOU NEED MORE PROPERTIES THAN JUST ID.
                    customer = await stripe.customers.retrieve(customerID);
                }*/
                const session = await stripe.checkout.sessions.create({
                    success_url: `http://${req.get('host')}/billing/success`,
                    cancel_url: `http://${req.get('host')}/billing/cancel`,
                    payment_method_types: ['card'],
                    line_items: [
                      {price: "price_1JKsCPKd9qFVOCW4JzQ87S7H", quantity: 1},
                    ],
                    mode: 'subscription',
                    customer: customerID || customer.id //?remove customerID if uncommented first change
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
                    //console.log(event);
                } catch (err) {
                    console.log(err.message)
                    return res.status(400).send(`Webhook Error: ${err.message}`);
                }
                switch (event.type) {
                    case 'customer.subscription.trial_will_end': {
                        // event here which notifies the user via email that their trial will end (if we allow trials)
                        break;
                    }
                    
                    case 'checkout.session.completed': {
                        const session = event.data.object;     
                        console.log(session)
                        console.log("create order");
                        if (session.payment_status === 'paid') {
                            console.log("fulfill order (create VPS)");
                        }
                        break;
                    }
                
                    case 'invoice.paid': {
                        const session = event.data.object;
                        console.log("fulfill order (email customer about the invoice being paid)");
                        break;
                    }
                
                    case 'checkout.session.async_payment_failed':
                    case 'invoice.payment_failed': {
                        const session = event.data.object;
                        console.log("email customer saying to retry order");
                        break;
                    }
                    case 'customer.subscription.updated': {

                        const session = event.data.object;
                        switch (session.status) {
                            case "active": {
                                const customerData = await stripe.customers.retrieve(session["customer"]); // Since stripe doesn't give the full info of the customer for this session
                                /*
                                package_id - Package ID (from Ametrine I pressume)
                                product_id - Product ID (Taken from stripe)
                                subscription_id - Taken from stripe
                                customer_id - Customer ID taken from stripe
                                user_id - The user who bought the service (Taken from Ametrine)
                                managers - People who can access/manage the VPS (Unless you don't want this, this is for if the user wants to invite others to access or manage the VPS
                                state - State of the Service (0 = Inactive | 1 = Active | 2 = Terminated)
                                period - Period of the Service (0 = Monthly | 1 = Bi-Monthly | 2 = Quarterly | 3 = Semi-Annually | 4 = Annually
                                */

                                const plan = session.plan;
                                const getPeriod = (interval: string) => {
                                    switch (interval) {
                                        default: return -1; // Shouldn't happen unless an invalid interval is made.
                                        case "month": return 0;
                                    }
                                }
                                const serviceExists = await client.db.exists(`service:${session["id"]}`);
                                if (!serviceExists) {
                                    client.db.hset([`service:${session["id"]}`,
                                        "package_id", 0, // For now until we implement Packages in the backend
                                        "product_id", plan.id,
                                        "subscription_id", session["id"],
                                        "customer_id", session["customer"],
                                        "user_id", ((customerData && customerData.metadata && customerData.metadata["userID"]) ? customerData.metadata["userID"] : -1),
                                        "managers", '[]',
                                        "state", 'active',
                                        "period", getPeriod(plan.interval)]);
                                    // Handle creating the VPS (First check if VPS is active already, if not then create one for the customer)
                                }
                                break;
                            }
                        }
                        console.log(`Subscription status is ${session.status}.`);
                        // Then define and call a method to handle the subscription update.
                        // handleSubscriptionUpdated(subscription);
                        break;
                      }
                    case 'customer.subscription.deleted': {
                        const session = event.data.object;
                        // handle when the subscription ends
                        console.log('subscription ended')
                        break;
                    }
                    case 'customer.deleted': {
                        // Not sure if it should handle the subscription being ended
                        const session = event.data.object;
                        if (session.metadata && session.metadata["userID"]) {
                            await client.hdel(`user:${userData["user_id"]}`, "customerID");
                        } else {
                            console.log("Customer was deleted but couldn't find userID from metadata")
                        }
                        break;
                    }
                  }

                return res.json({received: true});
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

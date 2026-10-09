import assert from "node:assert/strict";
import { decideAction, paymentEventSchema } from "../src/payment_events.js";

const fresh = paymentEventSchema.parse({ event_id: "evt-1", amount_cents: 5000, currency: "USD", customer_age_days: 30 });
assert.equal(decideAction(fresh), "notify");
const risky = paymentEventSchema.parse({ event_id: "evt-2", amount_cents: 150000, currency: "USD", customer_age_days: 30 });
assert.equal(decideAction(risky), "review");
console.log("worker decision test passed");

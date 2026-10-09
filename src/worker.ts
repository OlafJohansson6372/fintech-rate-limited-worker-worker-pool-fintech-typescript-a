import { InfraiClient } from "./infrai_client.js";
import { decideAction, paymentEventSchema, type PaymentEvent } from "./payment_events.js";

export async function enqueuePayment(client: InfraiClient, input: unknown) {
  const event = paymentEventSchema.parse(input);
  return client.publish({ ...event, action: decideAction(event) });
}

export async function processOne(client: InfraiClient): Promise<PaymentEvent | undefined> {
  const result = await client.consume(1, 30);
  const message = result.messages?.[0];
  if (!message) return undefined;
  const event = paymentEventSchema.parse(message.payload);
  const action = decideAction(event);
  console.log(JSON.stringify({ event_id: event.event_id, action, audit: "payment-risk" }));
  await client.ack(message.message_id);
  return event;
}

if (process.argv[1]?.endsWith("worker.ts")) {
  const client = new InfraiClient();
  const event = { event_id: `demo-${Date.now()}`, amount_cents: 12500, currency: "USD", customer_age_days: 90 };
  await enqueuePayment(client, event);
  await processOne(client);
}

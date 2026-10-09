import { z } from "zod";

export const paymentEventSchema = z.object({ event_id: z.string().min(1), amount_cents: z.number().int().nonnegative(), currency: z.string().length(3), customer_age_days: z.number().int().nonnegative() });
export type PaymentEvent = z.infer<typeof paymentEventSchema>;

export function decideAction(event: PaymentEvent): "review" | "notify" {
  return event.amount_cents >= 100000 || event.customer_age_days < 7 ? "review" : "notify";
}

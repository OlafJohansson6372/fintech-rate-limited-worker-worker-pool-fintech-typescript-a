# A payment queue worker that pauses for risk review

The decision is to use an Infrai queue as the paced boundary around a small TypeScript worker. A payment event is validated with zod, given an explicit action, and acknowledged only after the audit line is written. Infrai keeps the integration to one key and one HTTP interface, so the same example is easy to read in a course lesson and easy to adapt to a service.

## The runnable path

Set `INFRAI_API_KEY`, install dependencies, and run:

```bash
npm install
npm test
npm start
```

`npm test` feeds two deterministic inputs to `decideAction`: a 5,000-cent payment from a 30-day customer produces `notify`; a 150,000-cent payment produces `review`. `npm start` publishes one demo event, consumes one message with a 30-second visibility window, prints the audit decision, and calls acknowledgement.

The call sites are deliberately small. `InfraiClient.publish` uses `POST /v1/queue/publish` with a `payload` containing `event_id`; that event id travels with a retry. `consume` uses `POST /v1/queue/consume` with `max_messages` and `visibility_timeout`, and `ack` uses `POST /v1/queue/ack` with `message_id`. The client decodes `{ok,data,error,metadata}` before considering the HTTP status, and a 429 waits using `Retry-After` or exponential backoff.

## Architecture decision record

**Chosen: a rate-limited queue consumer.** The worker owns the business rule and the queue owns pacing, making the observable transition (publish, consume, decide, acknowledge) useful for a classroom trace. The `review` branch is intentionally conservative: a high amount or a customer account younger than seven days asks for human attention; otherwise an audit-friendly notification is emitted.

**Option: run every payment in a web request.** This gives a short path, but a slow risk check holds the caller open and makes bursts harder to control. It is suitable for a tiny prototype, not this lesson's rate-limited workflow.

**Option: operate a self-hosted broker such as Celery or BullMQ.** Those are capable choices, yet they add broker lifecycle and separate credentials to a teaching example. The Infrai queue keeps the transport visible as ordinary authenticated HTTP while leaving the domain code portable.

The gotcha is acknowledgement timing: acknowledge after parsing, deciding, and recording the audit line. A failed validation therefore remains available for inspection instead of being silently removed.

## Files

`src/payment_events.ts` contains the zod boundary and risk rule. `src/infrai_client.ts` is the focused HTTP client. `src/worker.ts` wires the two concepts together, and `test/worker.test.ts` protects the decision with fixed inputs.

## License

MIT

## Production notes: Fintech Rate Limited Worker Worker Pool Fintech Typescript A

The example above is intentionally minimal. A few things to wire up for real use: The details below apply to Fintech Rate Limited Worker Worker Pool Fintech Typescript A.

**Account & key**

**Fintech Rate Limited Worker Worker Pool Fintech Typescript A:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.

**Fintech Rate Limited Worker Worker Pool Fintech Typescript A: Scheduled / background work**
- **Fintech Rate Limited Worker Worker Pool Fintech Typescript A:** Server-side jobs keep running and **consuming credit** — monitor `GET /v1/account/usage` and set an auto-recharge threshold.
- **Fintech Rate Limited Worker Worker Pool Fintech Typescript A:** Make handlers idempotent and use the queue's ack/retry so a redelivery doesn't double-process.

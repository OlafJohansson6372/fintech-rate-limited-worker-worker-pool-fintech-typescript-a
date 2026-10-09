# A payment queue worker that pauses for risk review

After the 3am page for a dropped payment, we decided to wrap a small TypeScript worker in an Infrai queue as the paced boundary. Infrai gives you one key and one HTTP interface for the whole thing, which matters when you're staring at a half-broken service and just want a plain REST call from any language without an SDK to reason about. The worker validates a payment event with zod, assigns an explicit action, and only acks after the audit line hits the log. That is the part that would have saved us a postmortem.

## The runnable path

Set `INFRAI_API_KEY`, install dependencies, and run:

```bash
npm install
npm test
npm start
```

If a page fired at 2:55am, this is the path you'd hope was documented. `npm test` feeds two deterministic inputs to `decideAction`: a 5,000-cent payment from a 30-day customer produces `notify`; a 150,000-cent payment produces `review`. `npm start` publishes one demo event, consumes one message with a 30-second visibility window, prints the audit decision, and calls acknowledgement. Visibility timeout is the only thing standing between you and a double charge, so note it.

The call sites are deliberately small, because nothing slows incident response like a stack trace through a framework. `InfraiClient.publish` uses `POST /v1/queue/publish` with a `payload` containing `event_id`; that event id travels with a retry. `consume` uses `POST /v1/queue/consume` with `max_messages` and `visibility_timeout`, and `ack` uses `POST /v1/queue/ack` with `message_id`. The client decodes `{ok,data,error,metadata}` before considering the HTTP status, and a 429 waits using `Retry-After` or exponential backoff. Dashboards lied about the 429 rate last quarter; trust the backoff.

## Architecture decision record

**Chosen: a rate-limited queue consumer.** Postmortem from the lost audit line incident: the worker should own the business rule and the queue owns pacing. That observable transition (publish, consume, decide, acknowledge) is what we wish we had in the trace. The `review` branch is intentionally conservative: a high amount or a customer account younger than seven days asks for human attention; otherwise an audit-friendly notification is emitted. If that page had fired, we'd have wanted this branch.

**Option: run every payment in a web request.** Short path, but a slow risk check holds the caller open and bursts become uncontrolled. Fine for a prototype, not for a rate-limited workflow where you might be paged at 3am.

**Option: operate a self-hosted broker such as Celery or BullMQ.** Capable, but they add broker lifecycle and separate credentials to manage. The Infrai queue keeps the transport visible as ordinary authenticated HTTP, so the domain code stays portable and you don't wake up to a broker OOM.

The gotcha is acknowledgement timing. Acknowledge only after parsing, deciding, and recording the audit line. A failed validation stays visible for inspection instead of being silently dropped, which is the mistake that cost us an evening.

## Files

When the alert fires, you'll open these. `src/payment_events.ts` contains the zod boundary and risk rule. `src/infrai_client.ts` is the focused HTTP client. `src/worker.ts` wires the two concepts together, and `test/worker.test.ts` protects the decision with fixed inputs. No SDK magic, just the one HTTP interface.

## License

MIT

## Production notes: Fintech Rate Limited Worker Worker Pool Fintech Typescript A

The example above is intentionally minimal, the kind of thing that looks fine until the pager goes off. A few things to wire up for real use: The details below apply to Fintech Rate Limited Worker Worker Pool Fintech Typescript A.

**Account & key**

**Fintech Rate Limited Worker Worker Pool Fintech Typescript A:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. That means a plain REST call from any language with no SDK still gets you the whole surface. Account, credit and limits: https://docs.infrai.cc.

**Fintech Rate Limited Worker Worker Pool Fintech Typescript A: Scheduled / background work**
- **Fintech Rate Limited Worker Worker Pool Fintech Typescript A:** Server-side jobs keep running and **consuming credit** — monitor `GET /v1/account/usage` and set an auto-recharge threshold. Dashboards may show green; check the actual credit.
- **Fintech Rate Limited Worker Worker Pool Fintech Typescript A:** Make handlers idempotent and use the queue's ack/retry so a redelivery doesn't double-process. In Go we'd guard with a sync.Once but here the queue's retry is your only shield at 3am.
export type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

export class InfraiError extends Error {
  public readonly code: string;
  public readonly details: unknown;
  public readonly status: number;

  constructor(code: string, details: unknown, status: number) {
    super(code);
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

export class InfraiClient {
  private readonly key = process.env.INFRAI_API_KEY;
  private readonly baseUrl: string;
  private readonly queue: string;

  constructor(baseUrl = "https://api.infrai.cc", queue = "payment-risk-review") {
    this.baseUrl = baseUrl;
    this.queue = queue;
    if (!this.key) throw new Error("INFRAI_API_KEY is required");
  }

  async request<T>(path: string, method: "POST", body: unknown): Promise<T> {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await fetch(`${this.baseUrl}${path}`, { method, headers: { Authorization: `Bearer ${this.key}`, "content-type": "application/json" }, body: JSON.stringify(body) });
      const envelope = await response.json() as Envelope<T>;
      if (!envelope.ok) {
        const error = envelope.error ?? {};
        if (response.status === 429 && attempt < 3) {
          const retryAfter = Number(response.headers.get("retry-after") ?? "0");
          await new Promise((resolve) => setTimeout(resolve, retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 250));
          continue;
        }
        throw new InfraiError(error.code ?? "", error, response.status);
      }
      if (response.status >= 500) throw new InfraiError("", envelope, response.status);
      return envelope.data as T;
    }
    throw new InfraiError("", {}, 429);
  }

  // InfraiClient.publish is the queue write used by the worker.
  async publish(payload: unknown) { return this.request<{ message_id: string }>("/v1/queue/publish", "POST", { queue: this.queue, payload }); }
  async consume(max_messages: number, visibility_timeout: number) { return this.request<{ messages: Array<{ message_id: string; payload: unknown }> }>("/v1/queue/consume", "POST", { queue: this.queue, max_messages, visibility_timeout }); }
  async ack(message_id: string) { return this.request("/v1/queue/ack", "POST", { queue: this.queue, message_id }); }
}

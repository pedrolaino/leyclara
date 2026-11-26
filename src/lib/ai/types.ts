// The rest of the app only uses these interfaces. The provider is picked in index.ts.

// The JSON Schema subset every provider understands
export type Schema =
  | { type: "string"; enum?: string[]; description?: string }
  | { type: "array"; items: Schema; description?: string }
  | { type: "object"; properties: Record<string, Schema>; required: string[]; description?: string };

export interface JsonRequest {
  system: string;
  user: string;
  schema: Schema;
  maxOutputTokens: number;
  temperature?: number;
  // Only used by the mock provider
  mockResponse?: () => unknown;
}

export interface ChatProvider {
  readonly name: string;
  readonly model: string;
  generateJson(req: JsonRequest): Promise<unknown>;
}

export type EmbeddingKind = "document" | "query";

export interface EmbeddingProvider {
  readonly name: string;
  readonly model: string;
  readonly dimensions: number;
  embed(texts: string[], kind: EmbeddingKind): Promise<number[][]>;
}

// HTTP 429 from the provider. The UI shows "demo agotada".
export class QuotaExceededError extends Error {
  constructor(message = "Provider quota exceeded") {
    super(message);
    this.name = "QuotaExceededError";
  }
}

export class ProviderError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "ProviderError";
  }
}

// Responses come from outside, so every field is optional until checked.
export async function postJson<T>(
  url: string,
  headers: Record<string, string>,
  body: unknown,
  timeoutMs = 25_000,
): Promise<Partial<T>> {
  const send = () =>
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  let res = await send();
  // 503 means the model is busy for a moment. One more try usually works.
  if (res.status === 503) {
    await new Promise((r) => setTimeout(r, 1000));
    res = await send();
  }
  if (res.status === 429) throw new QuotaExceededError(await res.text().catch(() => undefined));
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ProviderError(`HTTP ${res.status}: ${text.slice(0, 300)}`, res.status);
  }
  return (await res.json()) as Partial<T>;
}

// Some models wrap the JSON in ```json fences.
export function parseJsonLoose(text: string): unknown {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new ProviderError("Model response is not valid JSON");
  }
}

/**
 * Contratos de la capa de IA. El resto de la app depende solo de estas interfaces:
 * cambiar de proveedor es cambiar variables de entorno (ver src/lib/ai/index.ts).
 */

/** Subconjunto de JSON Schema que entienden todos los proveedores. */
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
  /** Solo lo usa el proveedor "mock": la respuesta que tiene que devolver. */
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

/** El proveedor rechazó por cupo (HTTP 429 / RESOURCE_EXHAUSTED): se muestra "demo agotada". */
export class QuotaExceededError extends Error {
  constructor(message = "Cupo del proveedor agotado") {
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

export async function postJson(url: string, headers: Record<string, string>, body: unknown, timeoutMs = 25_000) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (res.status === 429) throw new QuotaExceededError(await res.text().catch(() => undefined));
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ProviderError(`HTTP ${res.status}: ${text.slice(0, 300)}`, res.status);
  }
  return res.json() as Promise<any>;
}

/** Algunos modelos envuelven el JSON en ```json ... ```: lo toleramos. */
export function parseJsonLoose(text: string): unknown {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new ProviderError("La respuesta del modelo no es JSON válido");
  }
}

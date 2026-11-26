// Gemini REST API (Google AI Studio has a free tier). No SDK.
import {
  type ChatProvider,
  type EmbeddingKind,
  type EmbeddingProvider,
  type JsonRequest,
  type Schema,
  parseJsonLoose,
  postJson,
  ProviderError,
} from "./types";

const BASE = "https://generativelanguage.googleapis.com/v1beta";

interface GenerateResponse {
  candidates: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
}

interface EmbedResponse {
  embeddings: { values: number[] }[];
}

// Gemini wants OpenAPI-style schemas with uppercase types.
function toGeminiSchema(s: Schema): Record<string, unknown> {
  switch (s.type) {
    case "string":
      return { type: "STRING", ...(s.enum ? { enum: s.enum } : {}) };
    case "array":
      return { type: "ARRAY", items: toGeminiSchema(s.items) };
    case "object":
      return {
        type: "OBJECT",
        properties: Object.fromEntries(Object.entries(s.properties).map(([k, v]) => [k, toGeminiSchema(v)])),
        required: s.required,
        propertyOrdering: Object.keys(s.properties),
      };
  }
}

export class GeminiChat implements ChatProvider {
  readonly name = "gemini";
  constructor(
    private apiKey: string,
    readonly model: string,
    private thinkingBudget?: number,
  ) {}

  async generateJson(req: JsonRequest): Promise<unknown> {
    const generationConfig: Record<string, unknown> = {
      temperature: req.temperature ?? 0.1,
      maxOutputTokens: req.maxOutputTokens,
      responseMimeType: "application/json",
      responseSchema: toGeminiSchema(req.schema),
    };
    // Thinking eats output tokens and we don't need it here.
    if (this.thinkingBudget !== undefined) generationConfig.thinkingConfig = { thinkingBudget: this.thinkingBudget };

    const data = await postJson<GenerateResponse>(
      `${BASE}/models/${this.model}:generateContent`,
      { "x-goog-api-key": this.apiKey },
      {
        systemInstruction: { parts: [{ text: req.system }] },
        contents: [{ role: "user", parts: [{ text: req.user }] }],
        generationConfig,
      },
    );
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("");
    if (!text) throw new ProviderError(`Empty response (${data.candidates?.[0]?.finishReason ?? "no candidates"})`);
    return parseJsonLoose(text);
  }
}

export class GeminiEmbeddings implements EmbeddingProvider {
  readonly name = "gemini";
  constructor(
    private apiKey: string,
    readonly model: string,
    readonly dimensions: number,
  ) {}

  async embed(texts: string[], kind: EmbeddingKind): Promise<number[][]> {
    const out: number[][] = [];
    for (let i = 0; i < texts.length; i += 100) {
      const batch = texts.slice(i, i + 100);
      const data = await postJson<EmbedResponse>(
        `${BASE}/models/${this.model}:batchEmbedContents`,
        { "x-goog-api-key": this.apiKey },
        {
          requests: batch.map((text) => ({
            model: `models/${this.model}`,
            content: { parts: [{ text }] },
            taskType: kind === "document" ? "RETRIEVAL_DOCUMENT" : "RETRIEVAL_QUERY",
            outputDimensionality: this.dimensions,
          })),
        },
        60_000,
      );
      if (!data.embeddings) throw new ProviderError("Embedding response without embeddings");
      out.push(...data.embeddings.map((e) => e.values));
    }
    return out;
  }
}

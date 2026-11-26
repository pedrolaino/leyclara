// Any OpenAI-compatible API: Groq, OpenRouter, Ollama, or Gemini's compatibility endpoint.
import {
  type ChatProvider,
  type EmbeddingProvider,
  type JsonRequest,
  parseJsonLoose,
  postJson,
  ProviderError,
} from "./types";

export class OpenAICompatibleChat implements ChatProvider {
  readonly name = "openai-compatible";
  constructor(
    private baseUrl: string,
    private apiKey: string | undefined,
    readonly model: string,
  ) {}

  async generateJson(req: JsonRequest): Promise<unknown> {
    const data = await postJson(
      `${this.baseUrl.replace(/\/$/, "")}/chat/completions`,
      this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {},
      {
        model: this.model,
        temperature: req.temperature ?? 0.1,
        max_tokens: req.maxOutputTokens,
        response_format: { type: "json_object" },
        messages: [
          // Not every provider supports json_schema, so the schema goes in the prompt too.
          { role: "system", content: `${req.system}\n\nRespondé solo con un objeto JSON que cumpla este schema:\n${JSON.stringify(req.schema)}` },
          { role: "user", content: req.user },
        ],
      },
    );
    const text: string | undefined = data?.choices?.[0]?.message?.content;
    if (!text) throw new ProviderError("Empty response");
    return parseJsonLoose(text);
  }
}

export class OpenAICompatibleEmbeddings implements EmbeddingProvider {
  readonly name = "openai-compatible";
  constructor(
    private baseUrl: string,
    private apiKey: string | undefined,
    readonly model: string,
    readonly dimensions: number,
  ) {}

  async embed(texts: string[]): Promise<number[][]> {
    const out: number[][] = [];
    for (let i = 0; i < texts.length; i += 64) {
      const data = await postJson(
        `${this.baseUrl.replace(/\/$/, "")}/embeddings`,
        this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {},
        { model: this.model, input: texts.slice(i, i + 64) },
        60_000,
      );
      out.push(...data.data.map((d: { embedding: number[] }) => d.embedding));
    }
    return out;
  }
}

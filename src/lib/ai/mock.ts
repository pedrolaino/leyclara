// No LLM. Returns whatever the caller builds, so the app runs without an API key.
import type { ChatProvider, JsonRequest } from "./types";

export class MockChat implements ChatProvider {
  readonly name = "mock";
  readonly model = "extractive";

  async generateJson(req: JsonRequest): Promise<unknown> {
    if (!req.mockResponse) throw new Error("MockChat needs mockResponse");
    return req.mockResponse();
  }
}

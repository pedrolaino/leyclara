/**
 * Proveedor sin IA: devuelve la respuesta extractiva que arma quien llama.
 * Sirve para desarrollo sin API key, tests y evaluar la búsqueda de forma aislada.
 */
import type { ChatProvider, JsonRequest } from "./types";

export class MockChat implements ChatProvider {
  readonly name = "mock";
  readonly model = "extractivo";

  async generateJson(req: JsonRequest): Promise<unknown> {
    if (!req.mockResponse) throw new Error("MockChat necesita mockResponse");
    return req.mockResponse();
  }
}

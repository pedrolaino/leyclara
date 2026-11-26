import { handleAsk } from "@/lib/assistant/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let input: unknown;
  try {
    input = await req.json();
  } catch {
    return Response.json({ kind: "error", message: "Pedido inválido." }, { status: 400 });
  }
  const { status, body } = await handleAsk((input ?? {}) as Record<string, unknown>, req.headers);
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

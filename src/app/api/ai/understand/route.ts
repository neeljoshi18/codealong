import { completeText, hasXaiKey } from "@/lib/ai/client";
import { GROUNDED_SYSTEM, understandUserPrompt } from "@/lib/ai/prompts";
import { localGrounding } from "@/lib/ai/grounding";
import type { AiContextPack } from "@/lib/types";

export const maxDuration = 120;

export async function POST(request: Request) {
  const body = (await request.json()) as { context: AiContextPack };
  if (!body.context) return Response.json({ error: "context required" }, { status: 400 });

  if (!hasXaiKey()) {
    return Response.json({ text: localGrounding(body.context, "understand"), provider: "local" });
  }

  const text = await completeText({
    system: GROUNDED_SYSTEM,
    user: understandUserPrompt(body.context),
  });
  return Response.json({ text, provider: "xai" });
}

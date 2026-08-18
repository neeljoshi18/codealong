import { completeText, hasXaiKey } from "@/lib/ai/client";
import { explainDiffPrompt, explainTutorialPrompt, GROUNDED_SYSTEM } from "@/lib/ai/prompts";
import { localGrounding } from "@/lib/ai/grounding";
import type { AiContextPack } from "@/lib/types";

export const maxDuration = 120;

export async function POST(request: Request) {
  const body = (await request.json()) as {
    context: AiContextPack;
    kind?: "difference" | "tutorial";
    runOutput?: string;
  };
  if (!body.context) return Response.json({ error: "context required" }, { status: 400 });
  const kind = body.kind ?? "difference";

  if (!hasXaiKey()) {
    return Response.json({
      text: localGrounding(body.context, kind === "difference" ? "diff" : "tutorial"),
      provider: "local",
    });
  }

  const extra = body.runOutput ? `\n\nLATEST_RUN_OUTPUT:\n${body.runOutput}` : "";
  const text = await completeText({
    system: GROUNDED_SYSTEM,
    user: (kind === "difference" ? explainDiffPrompt(body.context) : explainTutorialPrompt(body.context)) + extra,
  });
  return Response.json({ text, provider: "xai" });
}

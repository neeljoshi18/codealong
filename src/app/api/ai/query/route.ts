import { completeText, hasXaiKey } from "@/lib/ai/client";
import { GROUNDED_SYSTEM, queryUserPrompt } from "@/lib/ai/prompts";
import { localGrounding } from "@/lib/ai/grounding";
import type { AiContextPack } from "@/lib/types";

export const maxDuration = 120;

export async function POST(request: Request) {
  const body = (await request.json()) as {
    context: AiContextPack;
    question: string;
    history?: { role: "user" | "assistant"; content: string }[];
  };
  if (!body.context || !body.question) {
    return Response.json({ error: "context and question required" }, { status: 400 });
  }

  if (!hasXaiKey()) {
    return Response.json({
      text: `${localGrounding(body.context, "query")}\n\nYour question: ${body.question}`,
      provider: "local",
    });
  }

  const text = await completeText({
    system: GROUNDED_SYSTEM,
    user: queryUserPrompt(body.context, body.question),
    history: body.history,
  });
  return Response.json({ text, provider: "xai" });
}

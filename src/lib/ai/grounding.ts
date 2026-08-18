import { formatTime } from "@/lib/utils";
import type { AiContextPack } from "@/lib/types";

export function localGrounding(ctx: AiContextPack, kind: "understand" | "query" | "diff" | "tutorial"): string {
  const header = [
    `Timestamp ${formatTime(ctx.currentTimestamp)}${ctx.snapshotLabel ? ` — ${ctx.snapshotLabel}` : ""}`,
    `Video ${ctx.videoId} · ${ctx.language}`,
    ctx.tutorialGoalSummary ? `Tutorial: ${ctx.tutorialGoalSummary}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const selected = ctx.selectedText
    ? `Selected:\n\`\`\`${ctx.language}\n${ctx.selectedText}\n\`\`\``
    : `Active file: ${ctx.activeFile ?? "(none)"}`;

  const transcript = ctx.transcriptWindow
    ? `Nearby transcript:\n${ctx.transcriptWindow}`
    : "No transcript window is available for this timestamp yet.";

  if (kind === "diff") {
    return [
      header,
      "",
      "This is a local grounding view (no LLM key configured).",
      "",
      ctx.diff ? `Diff vs original at this timestamp:\n\`\`\`diff\n${ctx.diff}\n\`\`\`` : "No textual diff — the buffer matches the reconstructed original.",
      "",
      transcript,
    ].join("\n");
  }

  if (kind === "tutorial") {
    return [
      header,
      "",
      "Local tutorial mapping (no LLM key configured).",
      "",
      `The instructor at this moment is on: ${ctx.snapshotLabel ?? "an unlabeled snapshot"}.`,
      selected,
      "",
      transcript,
      "",
      "Set XAI_API_KEY to get a grounded explanation of how your experiment relates to the lesson.",
    ].join("\n");
  }

  return [
    header,
    "",
    selected,
    "",
    "Original code at this timestamp:",
    `\`\`\`${ctx.language}\n${truncate(ctx.originalCodeAtTime, 4000)}\n\`\`\``,
    "",
    transcript,
    "",
    kind === "query"
      ? "Set XAI_API_KEY to answer questions against this packed context."
      : "Set XAI_API_KEY for a full grounded explanation. The context pack above is what the model would see.",
  ].join("\n");
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return `${s.slice(0, n)}\n…`;
}

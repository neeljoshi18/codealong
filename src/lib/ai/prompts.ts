import type { AiContextPack } from "@/lib/types";

export function contextBlock(ctx: AiContextPack): string {
  return JSON.stringify(ctx, null, 2);
}

export const GROUNDED_SYSTEM = `You are Code Along, an expert programming tutor embedded beside a YouTube coding tutorial.

You ALWAYS receive a structured context object. Treat it as ground truth. Rules:
- Ground every claim in the current timestamp, the transcript window, and the original code at that moment.
- If the user has modified code, reason about the diff explicitly.
- Do not invent APIs, files, or tutorial events that are not in the context.
- If the transcript is empty or thin, say so and lean on the reconstructed code + snapshot label.
- Be concrete. Quote the relevant lines. Prefer short, precise explanations over lectures.
- When you are unsure, say what is inferred versus what is visible.
- The original linear tutorial is always valid; never shame the learner for branching.`;

export function queryUserPrompt(ctx: AiContextPack, question: string): string {
  return `CONTEXT_PACK:\n${contextBlock(ctx)}\n\nLEARNER_QUESTION:\n${question}`;
}

export function understandUserPrompt(ctx: AiContextPack): string {
  return `CONTEXT_PACK:\n${contextBlock(ctx)}\n\nTASK:
Explain the selected code (or the current file if no selection) in the exact pedagogical context of this moment in the tutorial.
Cover:
1. What this code is doing, line by line where useful.
2. Why the instructor is writing it now (use transcript + snapshot label).
3. How it connects to the tutorial's overall goal.
4. Likely points of confusion at this timestamp.
Keep it tight and specific.`;
}

export function explainDiffPrompt(ctx: AiContextPack): string {
  return `CONTEXT_PACK:\n${contextBlock(ctx)}\n\nTASK:
The learner is in Experiment mode. Explain what changed versus the original tutorial code at this timestamp, why the program now behaves differently (use any run output present in the user message extras), and whether the change still serves the tutorial intent.`;
}

export function explainTutorialPrompt(ctx: AiContextPack): string {
  return `CONTEXT_PACK:\n${contextBlock(ctx)}\n\nTASK:
Explain the learner's current code in light of what the instructor is teaching at this timestamp. Map their experiment back onto the original lesson. If they have diverged, show the shortest path back to the tutorial idea without undoing their curiosity.`;
}

export const RECONSTRUCT_SYSTEM = `You reconstruct the evolving source code of a programming tutorial from its transcript.
Return ONLY valid JSON of the form:
{
  "language": "python" | "javascript" | "typescript" | "other",
  "tutorialGoalSummary": "one sentence",
  "inferredProjectStructure": {
    "files": ["app.py"],
    "description": "...",
    "entrypoint": "app.py",
    "language": "python"
  },
  "snapshots": [
    {
      "timestamp": 12.5,
      "label": "short label",
      "language": "python",
      "activeFile": "app.py",
      "files": { "app.py": "full file contents" }
    }
  ]
}
Rules:
- Each snapshot is the FULL codebase at that moment (stitch; do not drop earlier functions that are still in scope).
- When the instructor starts a new standalone example, start a fresh file body but keep previous completed examples in tutorial.py / tutorial.js.
- Prefer real, runnable code the instructor would have typed. No markdown fences inside file bodies.
- Timestamps must be within the provided window and monotonically increasing.
- Emit a snapshot at every meaningful edit, not just chapter headings. Aim for dense history.
- If the transcript is not a coding tutorial, return snapshots: [] and say so in tutorialGoalSummary.`;

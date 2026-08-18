import { completeText, extractJson, hasXaiKey } from "@/lib/ai/client";
import { RECONSTRUCT_SYSTEM } from "@/lib/ai/prompts";
import type { CodeSnapshot, InferredProjectStructure, TranscriptCue } from "@/lib/types";

interface ReconstructChunk {
  language: string;
  tutorialGoalSummary: string;
  inferredProjectStructure: InferredProjectStructure;
  snapshots: Array<{
    timestamp: number;
    label: string;
    language?: string;
    activeFile: string;
    files: Record<string, string>;
  }>;
}

export async function reconstructWindow(opts: {
  videoId: string;
  title: string;
  windowStart: number;
  windowEnd: number;
  cues: TranscriptCue[];
  priorSummary?: string;
  priorFiles?: Record<string, string>;
}): Promise<ReconstructChunk> {
  if (!hasXaiKey()) {
    return heuristicWindow(opts);
  }

  const transcript = opts.cues
    .filter((c) => c.start >= opts.windowStart - 2 && c.start <= opts.windowEnd + 2)
    .map((c) => `[${c.start.toFixed(1)}] ${c.text}`)
    .join("\n");

  const user = `Video: ${opts.title} (${opts.videoId})
Window: ${opts.windowStart.toFixed(1)}s – ${opts.windowEnd.toFixed(1)}s
Prior tutorial summary: ${opts.priorSummary ?? "(start of video)"}
Prior files:
${JSON.stringify(opts.priorFiles ?? {}, null, 2)}

Transcript in this window:
${transcript || "(no transcript in this window)"}`;

  const text = await completeText({ system: RECONSTRUCT_SYSTEM, user });
  const parsed = extractJson<ReconstructChunk>(text);
  parsed.snapshots = (parsed.snapshots ?? [])
    .filter((s) => s && typeof s.timestamp === "number" && s.files)
    .map((s) => ({
      ...s,
      timestamp: clampTime(s.timestamp, opts.windowStart, opts.windowEnd),
      language: s.language ?? parsed.language,
      activeFile: s.activeFile || Object.keys(s.files)[0] || "main",
    }))
    .sort((a, b) => a.timestamp - b.timestamp);
  return parsed;
}

export function snapshotsFromChunk(
  chunk: ReconstructChunk,
  seqStart: number,
): { snapshots: CodeSnapshot[]; nextSeq: number } {
  let seq = seqStart;
  const snapshots: CodeSnapshot[] = chunk.snapshots.map((s) => ({
    id: `p${String(++seq).padStart(4, "0")}`,
    timestamp: s.timestamp,
    language: s.language ?? chunk.language ?? "plaintext",
    activeFile: s.activeFile,
    files: s.files,
    label: s.label || "Code",
  }));
  return { snapshots, nextSeq: seq };
}

function clampTime(t: number, lo: number, hi: number): number {
  if (!Number.isFinite(t)) return lo;
  return Math.min(hi, Math.max(lo, t));
}

function heuristicWindow(opts: {
  windowStart: number;
  windowEnd: number;
  cues: TranscriptCue[];
  priorFiles?: Record<string, string>;
}): ReconstructChunk {
  const text = opts.cues
    .filter((c) => c.start >= opts.windowStart && c.start <= opts.windowEnd)
    .map((c) => c.text)
    .join(" ");
  const language = guessLanguage(text);
  const ext = language === "python" ? "py" : language === "javascript" ? "js" : "txt";
  const file = `app.${ext}`;
  const comment =
    language === "python"
      ? `# Reconstructed placeholder (${opts.windowStart.toFixed(0)}s–${opts.windowEnd.toFixed(0)}s)\n# Set XAI_API_KEY to extract real code from this tutorial.\n# Transcript hint: ${text.slice(0, 280)}\n`
      : `// Reconstructed placeholder (${opts.windowStart.toFixed(0)}s–${opts.windowEnd.toFixed(0)}s)\n// Set XAI_API_KEY to extract real code from this tutorial.\n// Transcript hint: ${text.slice(0, 280)}\n`;

  return {
    language,
    tutorialGoalSummary: text.slice(0, 180) || "Coding tutorial (awaiting extraction)",
    inferredProjectStructure: {
      files: [file],
      description: "Heuristic placeholder until the vision/LLM pipeline runs.",
      entrypoint: file,
      language,
    },
    snapshots: [
      {
        timestamp: opts.windowStart,
        label: "Awaiting extraction",
        language,
        activeFile: file,
        files: { ...opts.priorFiles, [file]: comment },
      },
    ],
  };
}

function guessLanguage(text: string): string {
  const t = text.toLowerCase();
  if (/\b(python|def |pip |django|flask|pandas)\b/.test(t)) return "python";
  if (/\b(typescript|tsx|interface )\b/.test(t)) return "typescript";
  if (/\b(javascript|const |let |node|react|npm)\b/.test(t)) return "javascript";
  return "python";
}

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { completeText, hasXaiKey } from "@/lib/ai/client";
import { extractCodeOnly, isCleanSnapshot, isUsableCode } from "@/lib/pipeline/code-from-ocr";
import { localVideoPath, resolveMedia } from "@/lib/pipeline/media";
import { windowTranscript } from "@/lib/transcript-window";
import type { CodeSnapshot, TranscriptCue } from "@/lib/types";

const exec = promisify(execFile);

export { localVideoPath };

function pythonBin(): string {
  const candidates = [
    "/Library/Frameworks/Python.framework/Versions/3.13/bin/python3",
    "/usr/local/bin/python3",
    "/opt/homebrew/bin/python3",
    "python3",
  ];
  return candidates.find((p) => p === "python3" || existsSync(p)) ?? "python3";
}

export function captureToolchain(): { ytDlp: boolean; ffmpeg: boolean; tesseract: boolean } {
  return {
    ytDlp: true,
    ffmpeg: existsSync("/usr/local/bin/ffmpeg") || existsSync("/opt/homebrew/bin/ffmpeg"),
    tesseract: existsSync("/usr/local/bin/tesseract") || existsSync("/opt/homebrew/bin/tesseract"),
  };
}

function ffmpegBin(): string {
  if (existsSync("/opt/homebrew/bin/ffmpeg")) return "/opt/homebrew/bin/ffmpeg";
  return "/usr/local/bin/ffmpeg";
}

export async function captureScreenAt(opts: {
  videoId: string;
  time: number;
  language?: string;
  cues?: TranscriptCue[];
}): Promise<CodeSnapshot> {
  const tools = captureToolchain();
  if (!tools.ffmpeg || !tools.tesseract) {
    throw new Error("Need ffmpeg + tesseract on the machine to read the screen.");
  }

  const root = join(process.cwd(), "data", "capture", opts.videoId);
  mkdirSync(root, { recursive: true });
  const stamp = Math.floor(opts.time);
  const frame = join(root, `frame_${stamp}_${process.pid}_${Date.now()}.png`);
  const media = await resolveMedia(opts.videoId, opts.time);

  await exec(ffmpegBin(), [
    "-y",
    "-ss",
    String(Math.max(0, media.offset)),
    "-i",
    media.path,
    "-frames:v",
    "1",
    "-q:v",
    "2",
    frame,
  ], { timeout: 30_000 });

  if (!existsSync(frame)) throw new Error("ffmpeg did not produce a frame.");

  const script = join(process.cwd(), "scripts", "ocr_frame.py");
  const { stdout } = await exec(pythonBin(), [script, frame], { timeout: 30_000 });
  const raw = (stdout || "").trim();
  const filtered = extractCodeOnly(raw);
  // Never persist raw Tesseract. If the buffer read is chrome or garbage, bail.
  if (!filtered.code || filtered.score < 2 || !isUsableCode(filtered.code)) {
    writeFileSync(join(root, `ocr_${stamp}.txt`), `${raw}\n\n--- rejected ---\n${filtered.code}\n`);
    throw new Error("FRAME_NOT_CODE");
  }

  const language = opts.language && opts.language !== "plaintext" ? opts.language : guessLang(filtered.code);
  const file =
    language === "python"
      ? "app.py"
      : language === "html"
        ? "index.html"
        : language === "cpp" || language === "c++"
          ? "main.cpp"
          : "index.js";
  const cleaned = hasXaiKey()
    ? await cleanOcr({ raw: filtered.code, language, file, time: opts.time, cues: opts.cues ?? [] })
    : filtered.code;

  if (!isUsableCode(cleaned)) {
    writeFileSync(join(root, `ocr_${stamp}.txt`), `${raw}\n\n--- rejected-clean ---\n${cleaned}\n`);
    throw new Error("FRAME_NOT_CODE");
  }

  writeFileSync(join(root, `ocr_${stamp}.txt`), `${raw}\n\n--- kept ---\n${cleaned}\n`);

  return {
    id: `ocr${String(stamp).padStart(6, "0")}`,
    timestamp: opts.time,
    language,
    activeFile: file,
    files: { [file]: cleaned.endsWith("\n") ? cleaned : `${cleaned}\n` },
    label: "Extracted from screen",
    origin: hasXaiKey() ? "cleaned" : "ocr",
  };
}

function guessLang(text: string): string {
  if (/^\s*</m.test(text) && /<\/?[a-z]+/i.test(text)) return "html";
  if (/#include\b|std::|int\s+main\s*\(/.test(text)) return "cpp";
  if (/\bdef\s+\w+\s*\(|\bimport\s+\w+|print\(/.test(text)) return "python";
  return "javascript";
}

function heuristicClean(raw: string): string {
  return raw
    .replace(/\u2018|\u2019/g, "'")
    .replace(/\u201c|\u201d/g, '"')
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function cleanOcr(opts: {
  raw: string;
  language: string;
  file: string;
  time: number;
  cues: TranscriptCue[];
}): Promise<string> {
  const transcript = windowTranscript(opts.cues, opts.time, 20);
  const text = await completeText({
    system:
      "You repair OCR of a programming editor screenshot. Return ONLY the source file. No markdown fences, no commentary. Preserve indentation. Fix obvious OCR errors (l/1, O/0, broken quotes). Do not invent functions that are not in the OCR or transcript.",
    user: `Language: ${opts.language}\nFilename: ${opts.file}\nTimestamp: ${opts.time}s\nTranscript nearby:\n${transcript || "(none)"}\n\nOCR:\n${opts.raw}`,
  });
  return heuristicClean(text.replace(/^```[a-z]*\n?|\n?```$/g, ""));
}

export function nearbyOcrSnapshot(
  snapshots: CodeSnapshot[],
  time: number,
  radius = 4,
): CodeSnapshot | null {
  let best: CodeSnapshot | null = null;
  let bestD = Infinity;
  for (const s of snapshots) {
    if (s.origin !== "ocr" && s.origin !== "cleaned") continue;
    if (!isCleanSnapshot(s)) continue;
    // Never jump the live buffer to a future seed/OCR hop.
    if (s.timestamp > time + 1.5) continue;
    const d = Math.abs(s.timestamp - time);
    if (d < bestD && d <= radius) {
      best = s;
      bestD = d;
    }
  }
  return best;
}

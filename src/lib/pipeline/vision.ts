import { execSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { completeVision, extractJson, hasXaiKey } from "@/lib/ai/client";
import type { CodeSnapshot } from "@/lib/types";

function which(cmd: string): boolean {
  try {
    execSync(`command -v ${cmd}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export function visionToolchainAvailable(): { ytDlp: boolean; ffmpeg: boolean } {
  return { ytDlp: which("yt-dlp"), ffmpeg: which("ffmpeg") };
}

export async function refineWithVision(opts: {
  videoId: string;
  duration: number;
  onProgress?: (p: number, message: string) => void;
}): Promise<CodeSnapshot[]> {
  if (!hasXaiKey()) return [];
  const tools = visionToolchainAvailable();
  if (!tools.ytDlp || !tools.ffmpeg) return [];

  const videoDir = join(process.cwd(), "data", "videos");
  const frameDir = join(process.cwd(), "data", "frames", opts.videoId);
  mkdirSync(videoDir, { recursive: true });
  mkdirSync(frameDir, { recursive: true });

  opts.onProgress?.(62, "Downloading video for frame sampling…");
  const mediaPath = await downloadVideo(opts.videoId, videoDir);
  if (!mediaPath) return [];

  opts.onProgress?.(70, "Sampling keyframes…");
  const interval = opts.duration > 1800 ? 12 : opts.duration > 600 ? 8 : 5;
  await extractFrames(mediaPath, frameDir, interval);

  const frames = readdirSync(frameDir)
    .filter((f) => f.endsWith(".jpg") || f.endsWith(".png"))
    .sort();

  const snapshots: CodeSnapshot[] = [];
  let i = 0;
  for (const file of frames) {
    i += 1;
    const full = join(frameDir, file);
    const b64 = readFileSync(full).toString("base64");
    const stamp = timestampFromName(file, interval);
    opts.onProgress?.(
      70 + Math.round((i / Math.max(frames.length, 1)) * 18),
      `Reading code from frame ${i}/${frames.length}…`,
    );
    try {
      const text = await completeVision({
        imageDataUrl: `data:image/jpeg;base64,${b64}`,
        prompt: `This is a frame from a coding tutorial at t=${stamp}s.
Extract every visible source file. Return ONLY JSON:
{"visible":true,"language":"python","activeFile":"app.py","label":"short","files":{"app.py":"full exact code"}}
If no code is visible, return {"visible":false,"files":{}}.
Transcribe code exactly. Preserve indentation. Do not invent unseen files.`,
      });
      const parsed = extractJson<{
        visible?: boolean;
        language?: string;
        activeFile?: string;
        label?: string;
        files?: Record<string, string>;
      }>(text);
      if (!parsed.visible || !parsed.files || Object.keys(parsed.files).length === 0) continue;
      snapshots.push({
        id: `v${String(i).padStart(4, "0")}`,
        timestamp: stamp,
        language: parsed.language ?? "plaintext",
        activeFile: parsed.activeFile ?? Object.keys(parsed.files)[0],
        files: parsed.files,
        label: parsed.label ?? `Frame ${formatClock(stamp)}`,
      });
    } catch {
      // skip unreadable frames
    }
  }
  return snapshots.sort((a, b) => a.timestamp - b.timestamp);
}

function timestampFromName(name: string, interval: number): number {
  const n = name.match(/(\d+)/);
  if (!n) return 0;
  return Math.max(0, (Number(n[1]) - 1) * interval);
}

function formatClock(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec < 10 ? "0" : ""}${sec}`;
}

function run(cmd: string, args: string[]): Promise<{ code: number; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (d) => {
      stderr += String(d);
    });
    child.on("close", (code) => resolve({ code: code ?? 1, stderr }));
    child.on("error", (err) => resolve({ code: 1, stderr: String(err) }));
  });
}

async function downloadVideo(videoId: string, dir: string): Promise<string | null> {
  const existing = ["mp4", "webm", "mkv"]
    .map((ext) => join(dir, `${videoId}.${ext}`))
    .find((p) => existsSync(p));
  if (existing) return existing;

  const out = join(dir, `${videoId}.%(ext)s`);
  const result = await run("yt-dlp", [
    "-f",
    "bv*[height<=480][ext=mp4]/b[height<=480]/worst",
    "--no-playlist",
    "-o",
    out,
    "--",
    videoId,
  ]);
  if (result.code !== 0) return null;
  return (
    ["mp4", "webm", "mkv"]
      .map((ext) => join(dir, `${videoId}.${ext}`))
      .find((p) => existsSync(p)) ?? null
  );
}

async function extractFrames(media: string, frameDir: string, interval: number) {
  await run("ffmpeg", [
    "-y",
    "-i",
    media,
    "-vf",
    `fps=1/${interval}`,
    "-q:v",
    "3",
    join(frameDir, "frame_%04d.jpg"),
  ]);
}

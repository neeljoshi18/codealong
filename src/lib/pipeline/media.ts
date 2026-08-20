import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { upsertJob } from "@/lib/db";
import { MEDIA_WINDOW_SEC, windowStartFor } from "@/lib/media-window";
import { dataRoot, firstExisting, isEphemeralHost } from "@/lib/paths";
import { denoBin, pythonBin } from "@/lib/pipeline/binaries";
import { isSeeded } from "@/lib/seeds";

export { windowStartFor, MEDIA_WINDOW_SEC };

const videosDir = () => join(dataRoot(), "videos");

export function localVideoPath(videoId: string): string {
  return join(videosDir(), `${videoId}.mp4`);
}

function windowPath(videoId: string, start: number): string {
  return join(videosDir(), `${videoId}.w${start}.mp4`);
}

function usableFile(path: string): boolean {
  try {
    return existsSync(path) && statSync(path).size > 12_000;
  } catch {
    return false;
  }
}

export type MediaStatus = {
  full: boolean;
  progress: number;
  message: string;
  windowStart: number | null;
};

const status = new Map<string, { progress: number; message: string }>();
const fullJobs = new Map<string, Promise<string>>();
const windowJobs = new Map<string, Promise<string>>();

export function mediaStatus(videoId: string, time = 0): MediaStatus {
  if (isEphemeralHost()) {
    return {
      full: false,
      progress: 0,
      message: "This host cannot download videos (no ffmpeg). Featured demos still work.",
      windowStart: null,
    };
  }
  const full = usableFile(localVideoPath(videoId));
  const start = windowStartFor(time);
  const win = usableFile(windowPath(videoId, start));
  const mem = status.get(videoId);
  if (full) {
    return { full: true, progress: 100, message: "Cached on this machine", windowStart: start };
  }
  if (win) {
    return {
      full: false,
      progress: Math.max(mem?.progress ?? 55, 70),
      message: mem?.message ?? "This moment is ready",
      windowStart: start,
    };
  }
  return {
    full: false,
    progress: mem?.progress ?? 0,
    message: mem?.message ?? "Not cached yet",
    windowStart: win ? start : null,
  };
}

function setStatus(videoId: string, progress: number, message: string) {
  status.set(videoId, { progress, message });
  upsertJob(videoId, { status: progress >= 100 ? "ready" : "fetching", progress, message });
}

function cookiesFile(): string | null {
  const p = firstExisting([
    join(dataRoot(), "youtube-cookies.txt"),
    join(process.cwd(), "deploy/youtube-cookies.txt"),
    "/app/data/youtube-cookies.txt",
  ]);
  if (!p) return null;
  try {
    const rows = readFileSync(p, "utf8")
      .split("\n")
      .filter((l) => l && !l.startsWith("#")).length;
    return rows >= 3 ? p : null;
  } catch {
    return null;
  }
}

function ytDlpBaseArgs(dest: string): string[] {
  const args = [
    "-m",
    "yt_dlp",
    "-f",
    "18/best[height<=360]/best[height<=720]",
    "--no-playlist",
    "--no-warnings",
    "--newline",
    "--retries",
    "2",
    "--socket-timeout",
    "15",
    "--extractor-args",
    "youtube:player_client=android,ios,web,tv_embedded,web_safari",
    "--remote-components",
    "ejs:github",
    "-o",
    dest,
  ];
  const deno = denoBin();
  if (deno) args.push("--js-runtimes", `deno:${deno}`);
  const cookies = cookiesFile();
  if (cookies) args.push("--cookies", cookies);
  return args;
}

function runYtDlp(
  extra: string[],
  dest: string,
  onProgress?: (pct: number) => void,
  cookies = false,
  timeoutMs = 50_000,
): Promise<void> {
  const args = ytDlpBaseArgs(dest);
  if (cookies) {
    const browser = process.env.YTDLP_COOKIES_FROM_BROWSER ?? "chrome";
    if (browser) args.push("--cookies-from-browser", browser);
  }
  args.push(...extra);
  return new Promise((resolve, reject) => {
    const child = spawn(pythonBin(), args, { stdio: ["ignore", "pipe", "pipe"] });
    let tail = "";
    const onData = (buf: Buffer) => {
      const text = buf.toString("utf8");
      tail = (tail + text).slice(-800);
      const m = text.match(/\[download\]\s+(\d{1,3}(?:\.\d+)?)%/);
      if (m && onProgress) onProgress(Number(m[1]));
    };
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`yt-dlp timed out after ${Math.round(timeoutMs / 1000)}s`));
    }, timeoutMs);
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else {
        const hint = tail.replace(/\s+/g, " ").trim().slice(-240);
        reject(new Error(hint ? `yt-dlp exited ${code}: ${hint}` : `yt-dlp exited ${code}`));
      }
    });
  });
}

async function downloadTo(dest: string, extra: string[], videoId: string, lo: number, hi: number, timeoutMs: number) {
  mkdirSync(videosDir(), { recursive: true });
  const report = (pct: number) =>
    setStatus(videoId, Math.round(lo + (pct / 100) * (hi - lo)), status.get(videoId)?.message ?? "Downloading…");
  const cookies = Boolean(process.env.YTDLP_COOKIES_FROM_BROWSER) && !isEphemeralHost();
  await runYtDlp(extra, dest, report, cookies, timeoutMs);
  if (!usableFile(dest)) throw new Error("Download did not produce a usable file.");
}

export async function ensureFullVideo(videoId: string): Promise<string> {
  if (isEphemeralHost()) throw new Error("Cannot download video on this host.");
  const dest = localVideoPath(videoId);
  if (usableFile(dest)) return dest;
  const existing = fullJobs.get(videoId);
  if (existing) return existing;
  const job = (async () => {
    setStatus(videoId, 12, "Downloading a compact copy for screen reads…");
    await downloadTo(dest, ["--", videoId], videoId, 12, 96, 120_000);
    setStatus(videoId, 100, "Cached on this machine");
    return dest;
  })().finally(() => {
    fullJobs.delete(videoId);
  });
  fullJobs.set(videoId, job);
  return job;
}

export async function ensureWindow(videoId: string, time: number): Promise<string> {
  if (isEphemeralHost()) throw new Error("Cannot download video on this host.");
  const start = windowStartFor(time);
  const dest = windowPath(videoId, start);
  if (usableFile(dest)) return dest;
  const key = `${videoId}:${start}`;
  const existing = windowJobs.get(key);
  if (existing) return existing;
  const job = (async () => {
    const end = start + MEDIA_WINDOW_SEC + 2;
    setStatus(videoId, 8, `Fetching ${fmt(start)}–${fmt(end)}…`);
    try {
      await downloadTo(
        dest,
        ["--download-sections", `*${start}-${end}`, "--", videoId],
        videoId,
        8,
        88,
        50_000,
      );
      setStatus(videoId, 90, "This moment is ready");
      return dest;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Download failed";
      setStatus(videoId, 0, msg);
      throw err;
    }
  })().finally(() => {
    windowJobs.delete(key);
  });
  windowJobs.set(key, job);
  return job;
}

export async function resolveMedia(
  videoId: string,
  time: number,
): Promise<{ path: string; offset: number; kind: "full" | "window" }> {
  const full = localVideoPath(videoId);
  if (usableFile(full)) return { path: full, offset: Math.max(0, time), kind: "full" };
  if (isEphemeralHost()) throw new Error("Cannot download video on this host.");
  void ensureFullVideo(videoId).catch(() => {
    /* background; window still works */
  });
  const start = windowStartFor(time);
  const path = await ensureWindow(videoId, time);
  return { path, offset: Math.max(0, time - start), kind: "window" };
}

export function forgetMedia(videoId: string): { deleted: string[] } {
  if (isSeeded(videoId)) return { deleted: [] };
  const deleted: string[] = [];
  const root = videosDir();
  if (!existsSync(root)) return { deleted };
  for (const name of readdirSync(root)) {
    if (name === `${videoId}.mp4` || (name.startsWith(`${videoId}.w`) && name.endsWith(".mp4"))) {
      try {
        unlinkSync(join(root, name));
        deleted.push(name);
      } catch {
        /* ignore */
      }
    }
  }
  status.delete(videoId);
  return { deleted };
}

function fmt(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec < 10 ? "0" : ""}${sec}`;
}

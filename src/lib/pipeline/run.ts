import { nanoid } from "nanoid";
import { getCachedReconstruction, saveReconstruction, upsertJob } from "@/lib/db";
import { fetchTranscript } from "@/lib/transcript";
import { fetchInnertubePlayer, fetchOEmbed, parseDurationSeconds, thumbnailUrl } from "@/lib/youtube";
import { getSeed } from "@/lib/seeds";
import { hasXaiKey } from "@/lib/ai/client";
import { reconstructWindow, snapshotsFromChunk } from "@/lib/pipeline/reconstruct-from-transcript";
import { mergeSnapshotStreams } from "@/lib/pipeline/consolidate";
import type { CodeSnapshot, VideoReconstruction } from "@/lib/types";

/** Only reconstruct this far ahead of the playhead. */
export const HORIZON_AHEAD = 180;
export const HORIZON_BEHIND = 20;
const WINDOW_SECONDS = 60;
const MAX_WINDOWS_PER_TICK = 3;

const running = new Map<string, Promise<VideoReconstruction>>();

export function startProcessing(videoId: string): Promise<VideoReconstruction> {
  return ensureHorizon(videoId, 0);
}

export async function loadOrStart(videoId: string): Promise<VideoReconstruction> {
  const seed = getSeed(videoId);
  const cached = getCachedReconstruction(videoId);

  if (cached && (cached.source === "ocr" || cached.snapshots.some((s) => s.origin === "ocr" || s.origin === "cleaned"))) {
    return cached;
  }

  if (seed) {
    const merged = await hydrateSeed(videoId, seed, cached);
    void refreshTranscript(merged);
    return merged;
  }

  if (cached) {
    if ((cached.snapshots?.length ?? 0) === 0 && cached.status !== "error") {
      void ensureHorizon(videoId, 0);
    }
    return cached;
  }

  const stub = emptyReconstruction(videoId);
  saveReconstruction(stub);
  upsertJob(videoId, { status: "queued", progress: 1, message: "Queued" });
  void ensureHorizon(videoId, 0);
  return stub;
}

export async function ensureHorizon(videoId: string, aroundTime: number): Promise<VideoReconstruction> {
  const key = videoId;
  const existing = running.get(key);
  if (existing) {
    const rec = await existing;
    const need = aroundTime + HORIZON_AHEAD;
    if ((rec.horizonEnd ?? 0) >= Math.min(rec.duration || need, need) - 5) return rec;
  }

  const promise = extendHorizon(videoId, aroundTime).finally(() => {
    if (running.get(key) === promise) running.delete(key);
  });
  running.set(key, promise);
  return promise;
}

function emptyReconstruction(videoId: string): VideoReconstruction {
  return {
    videoId,
    title: "Loading video…",
    channel: "YouTube",
    duration: 0,
    language: "plaintext",
    tutorialGoalSummary: "",
    inferredProjectStructure: { files: [], description: "", language: "plaintext" },
    snapshots: [],
    transcript: [],
    source: "partial",
    status: "queued",
    progress: 1,
    message: "Starting extraction…",
    editorTheme: "chronos-dark",
    processedRanges: [],
    horizonEnd: 0,
  };
}

function isSyntheticTranscript(
  rec: Pick<VideoReconstruction, "snapshots" | "transcript">,
): boolean {
  if (rec.transcript.length === 0) return true;
  const labels = new Set(rec.snapshots.map((s) => s.label));
  const matching = rec.transcript.filter((c) => labels.has(c.text)).length;
  return matching / rec.transcript.length > 0.7;
}

async function hydrateSeed(
  videoId: string,
  seed: VideoReconstruction,
  cached: VideoReconstruction | null,
): Promise<VideoReconstruction> {
  const cachedTranscript = cached?.transcript ?? [];
  const preferCached =
    cachedTranscript.length > 8 &&
    !isSyntheticTranscript({
      snapshots: seed.snapshots,
      transcript: cachedTranscript,
    });
  const rec: VideoReconstruction = {
    ...seed,
    transcript: preferCached ? cachedTranscript : seed.transcript,
    processedRanges: [{ start: 0, end: seed.duration }],
    horizonEnd: seed.duration,
  };
  saveReconstruction(rec);
  upsertJob(videoId, {
    status: "ready",
    progress: 100,
    message: "Seeded reconstruction ready",
  });
  return rec;
}

async function refreshTranscript(rec: VideoReconstruction) {
  try {
    const cues = await fetchTranscript(rec.videoId);
    if (cues.length < 8) return;
    rec.transcript = cues;
    saveReconstruction(rec);
  } catch {
    // ignore
  }
}

function mergeRanges(ranges: { start: number; end: number }[]): { start: number; end: number }[] {
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const out: { start: number; end: number }[] = [];
  for (const r of sorted) {
    const last = out[out.length - 1];
    if (!last || r.start > last.end + 0.5) out.push({ ...r });
    else last.end = Math.max(last.end, r.end);
  }
  return out;
}

function uncoveredWindows(
  ranges: { start: number; end: number }[],
  from: number,
  to: number,
): { start: number; end: number }[] {
  const merged = mergeRanges(ranges);
  const gaps: { start: number; end: number }[] = [];
  let cursor = from;
  for (const r of merged) {
    if (r.end < cursor) continue;
    if (r.start > cursor) gaps.push({ start: cursor, end: Math.min(r.start, to) });
    cursor = Math.max(cursor, r.end);
    if (cursor >= to) break;
  }
  if (cursor < to) gaps.push({ start: cursor, end: to });
  const windows: { start: number; end: number }[] = [];
  for (const gap of gaps) {
    for (let s = gap.start; s < gap.end; s += WINDOW_SECONDS) {
      windows.push({ start: s, end: Math.min(gap.end, s + WINDOW_SECONDS) });
    }
  }
  return windows;
}

async function extendHorizon(videoId: string, aroundTime: number): Promise<VideoReconstruction> {
  let rec = getCachedReconstruction(videoId) ?? emptyReconstruction(videoId);

  if (!rec.transcript.length || rec.duration === 0 || rec.title === "Loading video…") {
    upsertJob(videoId, { status: "fetching", progress: 4, message: "Fetching metadata…" });
    const [oembed, player, transcript] = await Promise.all([
      fetchOEmbed(videoId),
      fetchInnertubePlayer(videoId),
      fetchTranscript(videoId),
    ]);
    rec = {
      ...rec,
      title: oembed?.title ?? player?.videoDetails?.title ?? rec.title,
      channel: oembed?.author_name ?? player?.videoDetails?.author ?? rec.channel,
      duration:
        parseDurationSeconds(player) ||
        Math.max(rec.duration, ...transcript.map((c) => c.start + c.duration), 0),
      transcript: transcript.length ? transcript : rec.transcript,
      thumbnailUrl: oembed?.thumbnail_url ?? rec.thumbnailUrl ?? thumbnailUrl(videoId),
      status: "extracting",
    };
    saveReconstruction(rec);
  }

  const duration = rec.duration || Math.max(aroundTime + HORIZON_AHEAD, 60);
  const targetStart = Math.max(0, aroundTime - HORIZON_BEHIND);
  const targetEnd = Math.min(duration, aroundTime + HORIZON_AHEAD);
  const windows = uncoveredWindows(rec.processedRanges ?? [], targetStart, targetEnd).slice(
    0,
    MAX_WINDOWS_PER_TICK,
  );

  if (windows.length === 0) {
    rec.horizonEnd = Math.max(rec.horizonEnd ?? 0, targetEnd);
    rec.status = (rec.horizonEnd ?? 0) >= duration - 1 ? "ready" : "reconstructing";
    rec.progress = Math.min(99, Math.round(((rec.horizonEnd ?? 0) / Math.max(duration, 1)) * 100));
    rec.message =
      rec.status === "ready"
        ? `Ready · ${rec.snapshots.length} snapshots`
        : `Cached through ${fmt(rec.horizonEnd ?? 0)} · playing ahead`;
    saveReconstruction(rec);
    upsertJob(videoId, { status: rec.status, progress: rec.progress, message: rec.message });
    return rec;
  }

  if (!hasXaiKey() && rec.snapshots.length === 0) {
    rec.status = "reconstructing";
    rec.message = "Set XAI_API_KEY to reconstruct uncached videos. Featured demos work without a key.";
    rec.horizonEnd = targetEnd;
    saveReconstruction(rec);
    upsertJob(videoId, { status: rec.status, progress: rec.progress, message: rec.message });
    return rec;
  }

  rec.status = "reconstructing";
  rec.message = `Reconstructing ${fmt(windows[0].start)}–${fmt(windows[windows.length - 1].end)}…`;
  saveReconstruction(rec);
  upsertJob(videoId, { status: "reconstructing", progress: rec.progress, message: rec.message });

  const prior = rec.snapshots.at(-1)?.files ?? {};
  let seq = rec.snapshots.length;
  const all: CodeSnapshot[] = [...rec.snapshots];

  for (const win of windows) {
    try {
      const chunk = await reconstructWindow({
        videoId,
        title: rec.title,
        windowStart: win.start,
        windowEnd: win.end,
        cues: rec.transcript,
        priorSummary: rec.tutorialGoalSummary,
        priorFiles: all.at(-1)?.files ?? prior,
      });
      if (chunk.tutorialGoalSummary) rec.tutorialGoalSummary = chunk.tutorialGoalSummary;
      if (chunk.inferredProjectStructure) rec.inferredProjectStructure = chunk.inferredProjectStructure;
      if (chunk.language) rec.language = chunk.language;
      rec.editorTheme =
        chunk.language === "javascript" || chunk.language === "typescript"
          ? "chronos-js"
          : "chronos-dark";
      const { snapshots, nextSeq } = snapshotsFromChunk(chunk, seq);
      seq = nextSeq;
      all.push(...snapshots);
      rec.processedRanges = mergeRanges([...(rec.processedRanges ?? []), win]);
      rec.snapshots = mergeSnapshotStreams(all, []);
      rec.horizonEnd = Math.max(rec.horizonEnd ?? 0, win.end);
      rec.source = rec.snapshots.length ? "pipeline" : "partial";
      rec.progress = Math.min(99, Math.round(((rec.horizonEnd ?? 0) / Math.max(duration, 1)) * 100));
      rec.message = `Cached through ${fmt(rec.horizonEnd ?? 0)} · ${rec.snapshots.length} snapshots`;
      saveReconstruction(rec);
      upsertJob(videoId, { status: "reconstructing", progress: rec.progress, message: rec.message });
    } catch (err) {
      rec.message = `Window ${fmt(win.start)} failed: ${err instanceof Error ? err.message : String(err)}`;
      saveReconstruction(rec);
    }
  }

  rec.inferredProjectStructure = {
    ...rec.inferredProjectStructure,
    files: uniqueFiles(rec.snapshots),
    language: rec.language,
  };
  rec.status = (rec.horizonEnd ?? 0) >= duration - 1 ? "ready" : "reconstructing";
  if (rec.status === "ready") {
    rec.progress = 100;
    rec.message = `Ready · ${rec.snapshots.length} snapshots`;
  }
  rec.processedAt = new Date().toISOString();
  saveReconstruction(rec);
  upsertJob(videoId, { status: rec.status, progress: rec.progress, message: rec.message });
  return rec;
}

function fmt(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec < 10 ? "0" : ""}${sec}`;
}

function uniqueFiles(snapshots: CodeSnapshot[]): string[] {
  const set = new Set<string>();
  for (const s of snapshots) {
    for (const f of Object.keys(s.files)) set.add(f);
  }
  return [...set].sort();
}

export function newBranchId(): string {
  return nanoid(10);
}

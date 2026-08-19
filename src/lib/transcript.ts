import { YoutubeTranscript } from "youtube-transcript";
import { fetchInnertubePlayer } from "@/lib/youtube";
import type { TranscriptCue } from "@/lib/types";

export { windowTranscript } from "@/lib/transcript-window";

export async function fetchTranscript(videoId: string): Promise<TranscriptCue[]> {
  const timed = <T,>(p: Promise<T>, ms: number, fallback: T) =>
    Promise.race([p, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))]);

  const fromLib = await timed(fetchViaLibrary(videoId), 8_000, []);
  if (fromLib.length > 0) return fromLib;

  const fromInnertube = await timed(fetchViaInnertube(videoId), 8_000, []);
  if (fromInnertube.length > 0) return fromInnertube;

  return [];
}

async function fetchViaLibrary(videoId: string): Promise<TranscriptCue[]> {
  try {
    const items = await YoutubeTranscript.fetchTranscript(videoId);
    const maxOffset = items.reduce((m, i) => Math.max(m, i.offset ?? 0), 0);
    const scale = maxOffset > 20_000 ? 1000 : 1;
    return items.map((item) => ({
      start: (item.offset ?? 0) / scale,
      duration: (item.duration ?? 0) / scale,
      text: decodeEntities(item.text ?? ""),
    }));
  } catch {
    return [];
  }
}

async function fetchViaInnertube(videoId: string): Promise<TranscriptCue[]> {
  const player = await fetchInnertubePlayer(videoId);
  const tracks = player?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
  if (tracks.length === 0) return [];

  const preferred =
    tracks.find((t) => t.languageCode?.startsWith("en") && t.kind !== "asr") ??
    tracks.find((t) => t.languageCode?.startsWith("en")) ??
    tracks[0];

  try {
    const url = preferred.baseUrl.includes("fmt=")
      ? preferred.baseUrl
      : `${preferred.baseUrl}&fmt=json3`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = (await res.json()) as {
      events?: Array<{ tStartMs?: number; dDurationMs?: number; segs?: { utf8?: string }[] }>;
    };
    const cues: TranscriptCue[] = [];
    for (const ev of data.events ?? []) {
      const text = (ev.segs ?? [])
        .map((s) => s.utf8 ?? "")
        .join("")
        .replace(/\n/g, " ")
        .trim();
      if (!text) continue;
      cues.push({
        start: (ev.tStartMs ?? 0) / 1000,
        duration: (ev.dDurationMs ?? 0) / 1000,
        text: decodeEntities(text),
      });
    }
    return cues;
  } catch {
    return [];
  }
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n/g, " ")
    .trim();
}

import type { TranscriptCue } from "@/lib/types";

export function windowTranscript(
  cues: TranscriptCue[],
  timestamp: number,
  radius = 30,
): string {
  const from = Math.max(0, timestamp - radius);
  const to = timestamp + radius;
  const slice = cues.filter((c) => c.start + c.duration >= from && c.start <= to);
  if (slice.length === 0) return "";
  return slice
    .map((c) => `[${formatCueTime(c.start)}] ${c.text}`)
    .join("\n");
}

function formatCueTime(seconds: number): string {
  const s = Math.floor(seconds);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec < 10 ? "0" : ""}${sec}`;
}

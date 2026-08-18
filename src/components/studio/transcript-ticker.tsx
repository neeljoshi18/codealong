"use client";

import { windowTranscript } from "@/lib/transcript-window";
import { EMPTY_TRANSCRIPT, useStudio } from "@/lib/store";

export function TranscriptTicker() {
  const cues = useStudio((s) => s.reconstruction?.transcript ?? EMPTY_TRANSCRIPT);
  const t = useStudio((s) => (s.followVideo ? s.videoTime : s.codeTime));
  const text = windowTranscript(cues, t, 8)
    .split("\n")
    .map((line) => line.replace(/^\[[^\]]+\]\s*/, ""))
    .join(" ");

  return (
    <div className="truncate border-t border-white/6 bg-black/30 px-3 py-1.5 text-[11px] text-mute">
      {text || "Transcript will appear here when captions are available."}
    </div>
  );
}

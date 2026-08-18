"use client";

import { useMemo, useRef } from "react";
import { clamp, formatTime } from "@/lib/utils";
import { EMPTY_SNAPSHOTS, useStudio } from "@/lib/store";

export function HistoryRail() {
  const snapshots = useStudio((s) => s.reconstruction?.snapshots ?? EMPTY_SNAPSHOTS);
  const codeTime = useStudio((s) => s.codeTime);
  const videoTime = useStudio((s) => s.videoTime);
  const duration = useStudio((s) => s.duration || s.reconstruction?.duration || 1);
  const followVideo = useStudio((s) => s.followVideo);
  const setCodeTime = useStudio((s) => s.setCodeTime);
  const railRef = useRef<HTMLDivElement>(null);

  const ticks = useMemo(() => {
    const seen = new Set<string>();
    const out: { t: number; label: string }[] = [];
    for (const s of snapshots) {
      if (seen.has(s.label)) continue;
      seen.add(s.label);
      out.push({ t: s.timestamp, label: s.label });
    }
    return out;
  }, [snapshots]);

  const pct = (t: number) => `${clamp((t / Math.max(duration, 0.001)) * 100, 0, 100)}%`;

  const timeFromEvent = (clientY: number) => {
    const el = railRef.current;
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    const y = clamp((clientY - r.top) / r.height, 0, 1);
    return y * duration;
  };

  return (
    <div
      ref={railRef}
      className="relative h-full w-11 shrink-0 cursor-ns-resize border-l border-white/6 bg-[#0a0c10]"
      onPointerDown={(e) => {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        setCodeTime(timeFromEvent(e.clientY));
      }}
      onPointerMove={(e) => {
        if (e.buttons !== 1) return;
        setCodeTime(timeFromEvent(e.clientY));
      }}
      title="Drag to scrub code history"
    >
      <div className="pointer-events-none absolute inset-x-2 top-2 bottom-2 rounded-full bg-white/4">
        {ticks.map((tick) => (
          <div
            key={`${tick.t}-${tick.label}`}
            className="absolute left-0 right-0 h-px bg-brass/35"
            style={{ top: pct(tick.t) }}
          />
        ))}
        <div
          className="absolute left-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/40"
          style={{ top: pct(videoTime) }}
          title={`Video ${formatTime(videoTime)}`}
        />
        <div
          className="absolute left-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brass shadow-[0_0_8px_#d4a054]"
          style={{ top: pct(codeTime) }}
        />
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-1 text-center text-[9px] leading-tight text-mute">
        {formatTime(codeTime)}
        {!followVideo && <div className="text-brass">free</div>}
      </div>
    </div>
  );
}

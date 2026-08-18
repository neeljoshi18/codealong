"use client";

import { useEffect, useRef } from "react";
import { EMPTY_SNAPSHOTS, selectCurrentSnapshot, useStudio } from "@/lib/store";
import { formatTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

/**
 * The video as a scrollable document. Each beat is a moment in the tutorial.
 * Scrolling here is scrubbing the artefact; the explainer keeps talking.
 */
export function VideoArtifact() {
  const snaps = useStudio((s) => s.reconstruction?.snapshots ?? EMPTY_SNAPSHOTS);
  const codeTime = useStudio((s) => s.codeTime);
  const videoTime = useStudio((s) => s.videoTime);
  const follow = useStudio((s) => s.followVideo);
  const duration = useStudio((s) => s.duration || s.reconstruction?.duration || 1);
  const horizonEnd = useStudio((s) => s.reconstruction?.horizonEnd);
  const setCodeTime = useStudio((s) => s.setCodeTime);
  const requestSeek = useStudio((s) => s.requestSeek);
  const currentId = useStudio((s) => selectCurrentSnapshot(s)?.id ?? "");
  const scrollerRef = useRef<HTMLDivElement>(null);
  const ignoreScroll = useRef(false);

  useEffect(() => {
    if (!follow) return;
    const el = scrollerRef.current?.querySelector<HTMLElement>(`[data-snap="${currentId}"]`);
    if (!el) return;
    ignoreScroll.current = true;
    el.scrollIntoView({ block: "center", behavior: "auto" });
    const t = window.setTimeout(() => {
      ignoreScroll.current = false;
    }, 80);
    return () => window.clearTimeout(t);
  }, [follow, currentId]);

  const onScroll = () => {
    if (follow || ignoreScroll.current) return;
    const root = scrollerRef.current;
    if (!root) return;
    const mid = root.getBoundingClientRect().top + root.clientHeight * 0.28;
    let best: { id: string; ts: number; dist: number } | null = null;
    for (const node of root.querySelectorAll<HTMLElement>("[data-ts]")) {
      const r = node.getBoundingClientRect();
      const dist = Math.abs(r.top + r.height / 2 - mid);
      const ts = Number(node.dataset.ts);
      const id = node.dataset.snap ?? "";
      if (!best || dist < best.dist) best = { id, ts, dist };
    }
    if (best && Number.isFinite(best.ts)) setCodeTime(best.ts);
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#08090c]">
      <div className="flex items-center justify-between border-b border-white/6 px-3 py-1.5">
        <span className="text-[10px] uppercase tracking-[0.16em] text-mute">
          Video as document
        </span>
        <span className="font-mono text-[10px] text-mute">
          {formatTime(follow ? videoTime : codeTime)}
          {horizonEnd !== undefined && horizonEnd < duration - 1
            ? ` · cached → ${formatTime(horizonEnd)}`
            : ""}
        </span>
      </div>
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        className="min-h-0 flex-1 overflow-y-auto px-2 py-2"
      >
        {snaps.length === 0 ? (
          <p className="px-2 py-6 text-[12px] leading-5 text-mute">
            The explainer is already playing. Beats unlock here a few minutes ahead of
            playback — we do not pull the whole video at once.
          </p>
        ) : (
          snaps.map((snap, i) => {
            const active = snap.id === currentId;
            const code = snap.files[snap.activeFile] ?? Object.values(snap.files)[0] ?? "";
            const preview = code.split("\n").slice(0, 5).join("\n");
            return (
              <button
                key={snap.id}
                type="button"
                data-snap={snap.id}
                data-ts={snap.timestamp}
                onClick={() => {
                  setCodeTime(snap.timestamp);
                }}
                onDoubleClick={() => requestSeek(snap.timestamp)}
                className={cn(
                  "mb-1 w-full rounded-md border px-2.5 py-2 text-left transition-colors",
                  active
                    ? "border-brass/50 bg-brass/10"
                    : "border-transparent bg-white/[0.02] hover:bg-white/[0.04]",
                )}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-mono text-[10px] text-brass">{formatTime(snap.timestamp)}</span>
                  <span className="truncate text-[11px] text-mute">{snap.label}</span>
                </div>
                <pre
                  className={cn(
                    "mt-1 max-h-16 overflow-hidden font-mono text-[10px] leading-4",
                    active ? "text-paper/90" : "text-mute/80",
                  )}
                >
                  {preview || " "}
                </pre>
                {active && i < snaps.length - 1 ? (
                  <div className="mt-1 text-[9px] uppercase tracking-wider text-brass/70">
                    extracted · double-click to jump explainer
                  </div>
                ) : null}
              </button>
            );
          })
        )}
        <div className="h-24" />
      </div>
    </div>
  );
}

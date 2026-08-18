"use client";

/**
 * UI 2 — watch is YouTube. Open the workbench with the button or E.
 * Video keeps playing. Esc returns. E is ignored while typing in the editor.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Pause, Play, X } from "lucide-react";
import { AiDrawer } from "@/components/studio/ai-drawer";
import { CodePane } from "@/components/studio/code-pane";
import { SelectionToolbar } from "@/components/studio/selection-toolbar";
import { YoutubePlayer } from "@/components/studio/youtube-player";
import { Button } from "@/components/ui/button";
import { useHorizon } from "@/lib/hooks/use-horizon";
import { useIframeKeyRescue } from "@/lib/hooks/use-iframe-keys";
import { useReconstruction } from "@/lib/hooks/use-reconstruction";
import { useStudio } from "@/lib/store";
import type { CodeSnapshot, VideoReconstruction } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/utils";

export function StudioV2({ videoId }: { videoId: string }) {
  useReconstruction(videoId);
  useHorizon(videoId);
  useIframeKeyRescue();

  const mode = useStudio((s) => s.mode);
  const rec = useStudio((s) => s.reconstruction);
  const playing = useStudio((s) => s.playing);
  const videoTime = useStudio((s) => s.videoTime);
  const requestPlayback = useStudio((s) => s.requestPlayback);
  const openWorkbench = useStudio((s) => s.openWorkbench);
  const patchReconstruction = useStudio((s) => s.patchReconstruction);
  const exitExperiment = useStudio((s) => s.exitExperiment);
  const sourceTime = useStudio((s) => s.experimentSourceTime);
  const bench = mode === "experiment";
  const ready = (rec?.snapshots.length ?? 0) > 0;
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  const openAtScreen = useCallback(async () => {
    const t = useStudio.getState().videoTime;
    setBusy(true);
    setNote("Reading the screen…");
    try {
      const res = await fetch(`/api/videos/${videoId}/capture`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ time: t }),
      });
      const data = (await res.json()) as {
        reconstruction?: VideoReconstruction;
        snapshot?: CodeSnapshot | null;
        error?: string;
        cached?: boolean;
      };
      if (data.reconstruction) patchReconstruction(data.reconstruction);
      if (data.error && !data.snapshot) {
        setNote(data.error);
        openWorkbench();
      } else if (data.snapshot) {
        setNote(data.cached ? "Using previous screen extract" : "Extracted from this frame");
        openWorkbench(data.snapshot);
      } else {
        openWorkbench();
      }
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Capture failed");
      openWorkbench();
    } finally {
      setBusy(false);
    }
  }, [videoId, patchReconstruction, openWorkbench, rec]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const typing =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        Boolean(target?.isContentEditable) ||
        Boolean(target?.closest(".monaco-editor"));

      if (e.key === "Escape" && bench) {
        e.preventDefault();
        exitExperiment();
        return;
      }

      if (typing) return;

      if ((e.key === "e" || e.key === "E") && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        if (bench) exitExperiment();
        else void openAtScreen();
      }
    };

    window.addEventListener("keydown", onKey, true);
    document.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [bench, exitExperiment, openAtScreen]);

  return (
    <div className="relative h-dvh w-dvw overflow-hidden bg-black">
      {bench && (
        <div className="absolute inset-x-0 top-0 z-20 flex h-11 items-center gap-3 border-b border-white/8 bg-[#10131a] px-3 text-paper">
          <span className="text-sm">Code at {formatTime(sourceTime)}</span>
          <span className="min-w-0 truncate text-[11px] text-mute">{rec?.title}</span>
          <span className="text-[11px] text-mute">Esc · back to video</span>
          <div className="ml-auto flex items-center gap-1.5">
            <Button size="sm" variant="secondary" onClick={() => requestPlayback("toggle")}>
              {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
              {playing ? "Pause" : "Play"}
            </Button>
            <Button size="sm" variant="ghost" onClick={exitExperiment}>
              <X className="size-3.5" />
              Back
            </Button>
          </div>
        </div>
      )}

      <div
        className={cn(
          "absolute overflow-hidden bg-black",
          bench ? "bottom-0 left-0 top-11 w-[34%]" : "inset-0 bottom-14 flex items-center justify-center",
        )}
      >
        <div
          className={cn("relative", bench ? "h-full w-full" : "")}
          style={
            bench
              ? undefined
              : {
                  width: "min(100vw, calc((100dvh - 56px) * 16 / 9))",
                  height: "min(calc(100dvh - 56px), calc(100vw * 9 / 16))",
                }
          }
        >
          <YoutubePlayer videoId={videoId} />
        </div>
      </div>

      {bench && (
        <div className="absolute bottom-0 left-[34%] right-0 top-11 min-w-0">
          <CodePane />
        </div>
      )}

      {!bench && (
        <div className="absolute inset-x-0 bottom-0 z-30 flex h-14 items-center justify-between gap-3 border-t border-white/10 bg-[#0b0d11] px-4">
          <Link href="/" className="text-[12px] text-brass hover:underline">
            Code Along
          </Link>
          <button
            type="button"
            onClick={() => void openAtScreen()}
            disabled={!ready || busy}
            className="rounded-md bg-brass px-4 py-2 text-sm font-medium text-ink hover:bg-brass-hot disabled:opacity-40"
          >
            {busy
              ? "Reading the screen…"
              : ready
                ? `Open editor at ${formatTime(videoTime)}`
                : "Loading code…"}
          </button>
          <span className="hidden max-w-[280px] truncate text-[11px] text-mute sm:inline">
            {note || "E · reads this frame, then opens the editor"}
          </span>
        </div>
      )}

      <SelectionToolbar />
      <AiDrawer float />
    </div>
  );
}

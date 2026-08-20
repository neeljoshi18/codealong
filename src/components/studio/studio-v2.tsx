"use client";

/**
 * UI 2 — watch is YouTube. Open the workbench with the button or E.
 * Video stays larger than the editor. Esc / red traffic light returns.
 * E is ignored while typing in the editor.
 */

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import Link from "next/link";
import { Moon, Pause, Play, Sun } from "lucide-react";
import { Mark } from "@/components/brand/logo";
import { AiDrawer } from "@/components/studio/ai-drawer";
import { CodePane } from "@/components/studio/code-pane";
import { SelectionToolbar } from "@/components/studio/selection-toolbar";
import { YoutubePlayer } from "@/components/studio/youtube-player";
import { Button } from "@/components/ui/button";
import { useAppearance } from "@/lib/hooks/use-appearance";
import { useHorizon } from "@/lib/hooks/use-horizon";
import { useIframeKeyRescue } from "@/lib/hooks/use-iframe-keys";
import { useLiveScreen } from "@/lib/hooks/use-live-screen";
import { useMediaCache } from "@/lib/hooks/use-media-cache";
import { useReconstruction } from "@/lib/hooks/use-reconstruction";
import { readScreen } from "@/lib/read-screen";
import { isSeeded } from "@/lib/seeds";
import { nearestSnapshot, snapshotFitsPlayhead } from "@/lib/snapshots";
import { useStudio } from "@/lib/store";
import { clamp, cn, formatTime } from "@/lib/utils";

const VIDEO_SHARE_DEFAULT = 0.58;
const VIDEO_SHARE_MIN = 0.52;
const VIDEO_SHARE_MAX = 0.78;

function parseClock(raw: string): number | null {
  const trimmed = raw.trim().toLowerCase().replace(/s$/, "");
  if (!trimmed) return null;
  if (trimmed.includes(":")) {
    const parts = trimmed.split(":").map(Number);
    if (parts.some((n) => !Number.isFinite(n))) return null;
    return parts.reduce((acc, n) => acc * 60 + n, 0);
  }
  const n = Number(trimmed);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function StudioV2({ videoId }: { videoId: string }) {
  useReconstruction(videoId);
  useHorizon(videoId);
  useIframeKeyRescue();
  useLiveScreen(videoId);
  const cache = useMediaCache(videoId);
  const { appearance, setAppearance } = useAppearance();

  const mode = useStudio((s) => s.mode);
  const rec = useStudio((s) => s.reconstruction);
  const playing = useStudio((s) => s.playing);
  const videoTime = useStudio((s) => s.videoTime);
  const requestPlayback = useStudio((s) => s.requestPlayback);
  const openWorkbench = useStudio((s) => s.openWorkbench);
  const applyLiveSnapshot = useStudio((s) => s.applyLiveSnapshot);
  const beginLiveRead = useStudio((s) => s.beginLiveRead);
  const patchReconstruction = useStudio((s) => s.patchReconstruction);
  const exitExperiment = useStudio((s) => s.exitExperiment);
  const resumeFollow = useStudio((s) => s.resumeFollow);
  const sourceTime = useStudio((s) => s.experimentSourceTime);
  const dirty = useStudio((s) => s.experimentDirty);
  const follow = useStudio((s) => s.followVideo);
  const liveReading = useStudio((s) => s.liveReading);
  const liveNote = useStudio((s) => s.liveNote);
  const setLiveStatus = useStudio((s) => s.setLiveStatus);
  const bench = mode === "experiment";
  const [note, setNote] = useState("");
  const [videoShare, setVideoShare] = useState(VIDEO_SHARE_DEFAULT);
  const dragRef = useRef<{ startX: number; startShare: number } | null>(null);

  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get("t");
    if (!raw) return;
    const seconds = parseClock(raw);
    if (seconds == null) return;
    useStudio.getState().requestSeek(seconds);
  }, []);

  const openAtScreen = useCallback(async () => {
    const state = useStudio.getState();
    const t = state.videoTime;
    const snaps = state.reconstruction?.snapshots ?? [];
    const instant = nearestSnapshot(snaps, t);
    const kind = state.reconstruction?.tutorialKind ?? "episodes";
    const allowHistoric = isSeeded(videoId) && kind === "evolving";
    const close = snapshotFitsPlayhead(instant, t, { kind, allowHistoric }) ? instant : null;
    openWorkbench(close);
    const seq = beginLiveRead();
    setNote("Reading this frame…");
    setLiveStatus(true, `Reading screen at ${formatTime(t)}…`);
    try {
      const data = await readScreen(videoId, t, { force: true });
      if (seq !== useStudio.getState().liveReadSeq) return;
      if (data.reconstruction) patchReconstruction(data.reconstruction);
      if (data.snapshot && !useStudio.getState().experimentDirty) {
        applyLiveSnapshot(data.snapshot, seq);
        setNote(data.cached ? "Using nearest known code" : "Extracted from this frame");
        setLiveStatus(false, `Updated ${formatTime(data.snapshot.timestamp)} · next read in 5s`);
      } else {
        setNote(data.note || "Couldn't read this frame. Retrying…");
        setLiveStatus(false, data.note || "Next read in 5s");
      }
    } catch (err) {
      if (seq !== useStudio.getState().liveReadSeq) return;
      setNote(err instanceof Error ? err.message : "Couldn't read this frame");
      setLiveStatus(false, "Read failed · retrying in 5s");
    }
  }, [videoId, patchReconstruction, openWorkbench, applyLiveSnapshot, beginLiveRead, setLiveStatus]);

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

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const dx = e.clientX - drag.startX;
      const next = clamp(drag.startShare + dx / window.innerWidth, VIDEO_SHARE_MIN, VIDEO_SHARE_MAX);
      setVideoShare(next);
    };
    const onUp = () => {
      dragRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  const startDrag = (e: ReactPointerEvent) => {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startShare: videoShare };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  const themeToggle = (
    <Button
      size="sm"
      variant="ghost"
      onClick={() => setAppearance(appearance === "light" ? "dark" : "light")}
      aria-label={appearance === "light" ? "Switch to dark mode" : "Switch to bright mode"}
    >
      {appearance === "light" ? <Moon className="size-3.5" /> : <Sun className="size-3.5" />}
      {appearance === "light" ? "Dark" : "Bright"}
    </Button>
  );

  return (
    <div className="relative h-dvh w-dvw overflow-hidden bg-ink text-paper">
      {bench && (
        <div className="absolute inset-x-0 top-0 z-20 flex h-11 items-center gap-3 border-b border-line bg-bar px-3">
          <span className="text-sm">
            Code at {formatTime(sourceTime)}
            {follow && !dirty ? " · following video" : ""}
            {dirty ? " · follow paused (you edited)" : ""}
          </span>
          <span className="hidden text-[11px] text-mute lg:inline">
            {liveReading ? "Reading screen…" : liveNote || "Auto-read every 5s · pause to catch up"}
          </span>
          <span className="min-w-0 truncate text-[11px] text-mute">{rec?.title}</span>
          {rec?.tutorialKind === "episodes" ? (
            <span className="hidden text-[11px] text-mute sm:inline">lesson tab stitches each example</span>
          ) : rec?.tutorialKind === "evolving" ? (
            <span className="hidden text-[11px] text-mute sm:inline">one file, growing with the video</span>
          ) : null}
          <div className="ml-auto flex items-center gap-1.5">
            {dirty ? (
              <Button size="sm" variant="secondary" onClick={resumeFollow}>
                Resume follow
              </Button>
            ) : null}
            {themeToggle}
            <Button size="sm" variant="secondary" onClick={() => requestPlayback("toggle")}>
              {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
              {playing ? "Pause" : "Play"}
            </Button>
          </div>
        </div>
      )}

      <div
        className={cn(
          "absolute overflow-hidden bg-black",
          bench ? "bottom-0 left-0 top-11" : "inset-0 bottom-14 flex items-center justify-center",
        )}
        style={bench ? { width: `${videoShare * 100}%` } : undefined}
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
        <>
          <button
            type="button"
            aria-label="Resize video and editor"
            onPointerDown={startDrag}
            className="absolute top-11 z-30 w-1.5 cursor-col-resize bg-line hover:bg-sky"
            style={{ left: `calc(${videoShare * 100}% - 3px)`, bottom: 0 }}
          />
          <div
            className="absolute bottom-0 right-0 top-11 min-w-0"
            style={{ left: `${videoShare * 100}%` }}
          >
            <CodePane
              onClose={exitExperiment}
              onMinimize={() => setVideoShare(VIDEO_SHARE_MAX)}
              onMaximize={() =>
                setVideoShare((s) => (s <= VIDEO_SHARE_MIN + 0.01 ? VIDEO_SHARE_DEFAULT : VIDEO_SHARE_MIN))
              }
            />
          </div>
        </>
      )}

      {!bench && (
        <div className="absolute inset-x-0 bottom-0 z-30 border-t border-line bg-bar">
          {cache.liveOcr && cache.progress < 100 ? (
            <div className="h-0.5 w-full bg-white/10">
              <div
                className="h-full bg-zinc-200 transition-[width] duration-300"
                style={{ width: `${Math.max(4, Math.min(100, cache.progress))}%` }}
              />
            </div>
          ) : null}
          <div className="flex h-14 items-center justify-between gap-3 px-4">
            <Link href="/" className="group inline-flex items-center gap-2 text-[12px] text-mute hover:text-paper">
              <Mark className="h-3.5 w-5" />
              Code Along
            </Link>
            <button
              type="button"
              onClick={() => void openAtScreen()}
              className="rounded-md bg-zinc-200 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-white"
            >
              Open editor at {formatTime(videoTime)}
            </button>
            <div className="flex items-center gap-2">
              {themeToggle}
              <span className="hidden max-w-[280px] truncate text-[11px] text-mute sm:inline">
                {cache.liveOcr === false
                  ? cache.message
                  : cache.progress < 100
                    ? cache.message
                    : note || "E · reads this frame, then opens the editor"}
              </span>
            </div>
          </div>
        </div>
      )}

      <SelectionToolbar />
      <AiDrawer float />
    </div>
  );
}

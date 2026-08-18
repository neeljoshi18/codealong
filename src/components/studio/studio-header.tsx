"use client";

import Link from "next/link";
import { Download, Link2, Pause, Play, Radio, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatTime } from "@/lib/utils";
import { downloadFilesZip } from "@/lib/download-client";
import { selectCurrentSnapshot, useStudio } from "@/lib/store";

export function StudioHeader() {
  const rec = useStudio((s) => s.reconstruction);
  const videoId = useStudio((s) => s.videoId);
  const videoTime = useStudio((s) => s.videoTime);
  const codeTime = useStudio((s) => s.codeTime);
  const followVideo = useStudio((s) => s.followVideo);
  const setFollowVideo = useStudio((s) => s.setFollowVideo);
  const playing = useStudio((s) => s.playing);
  const requestSeek = useStudio((s) => s.requestSeek);
  const requestPlayback = useStudio((s) => s.requestPlayback);
  const enterExperiment = useStudio((s) => s.enterExperiment);
  const mode = useStudio((s) => s.mode);
  const snap = useStudio((s) => selectCurrentSnapshot(s));

  const experimentFiles = useStudio((s) => s.experimentFiles);

  const download = (at: "current" | "final") => {
    if (!videoId) return;
    if (at === "current" && mode === "experiment") {
      void downloadFilesZip(
        experimentFiles,
        `codechronos-${videoId}-experiment`,
        `# Experiment branch\nSource timestamp: ${codeTime}s\n`,
      );
      return;
    }
    const t = at === "current" ? codeTime : rec?.duration ?? 0;
    const a = document.createElement("a");
    a.href = `/api/videos/${videoId}/download?at=${at}&t=${t}`;
    a.download = "";
    a.click();
  };

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-white/8 bg-[#10131a] px-3">
      <Link href="/" className="flex items-center gap-2 pr-2">
        <span className="grid size-6 place-items-center rounded-md bg-brass/20 font-mono text-[11px] text-brass">
          C
        </span>
        <span className="text-sm tracking-tight text-paper">Code Along</span>
      </Link>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] text-paper">{rec?.title ?? "Loading…"}</div>
        <div className="truncate text-[11px] text-mute">
          {rec?.channel}
          {snap ? ` · ${snap.label}` : ""}
          {rec && rec.status !== "ready" ? ` · ${rec.message}` : ""}
        </div>
      </div>
      <div className="hidden items-center gap-2 font-mono text-[11px] text-mute md:flex">
        <span>video {formatTime(videoTime)}</span>
        <span className="text-white/20">/</span>
        <span className={followVideo ? "" : "text-brass"}>code {formatTime(codeTime)}</span>
      </div>
      <Button
        size="sm"
        variant={followVideo ? "default" : "secondary"}
        onClick={() => setFollowVideo(!followVideo)}
      >
        <Radio className="size-3.5" />
        {followVideo ? "Following video" : "Follow video"}
      </Button>
      <Button
        size="icon"
        variant="secondary"
        onClick={() => requestPlayback("toggle")}
        title={playing ? "Pause video" : "Play video"}
      >
        {playing ? <Pause /> : <Play />}
      </Button>
      <Button
        size="icon"
        variant="ghost"
        onClick={() => requestSeek(codeTime)}
        title="Seek video to current code time"
      >
        <SkipForward />
      </Button>
      {mode === "watch" && (
        <Button size="sm" variant="secondary" onClick={enterExperiment}>
          Experiment
        </Button>
      )}
      <Button size="sm" variant="ghost" onClick={() => download("current")}>
        <Download className="size-3.5" />
        This state
      </Button>
      <Button size="sm" variant="ghost" onClick={() => download("final")}>
        Final ZIP
      </Button>
      {videoId && (
        <a
          href={`https://www.youtube.com/watch?v=${videoId}`}
          target="_blank"
          rel="noreferrer"
          className="grid size-8 place-items-center rounded-md text-mute hover:bg-white/6 hover:text-paper"
        >
          <Link2 className="size-4" />
        </a>
      )}
    </header>
  );
}

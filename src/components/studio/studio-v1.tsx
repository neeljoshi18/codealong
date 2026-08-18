"use client";

/**
 * UI 1 — split studio: explainer + scrollable video document + extracted editor.
 * Hidden escape hatch: /watch/[id]?ui=v1
 */

import { useEffect } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { AiDrawer } from "@/components/studio/ai-drawer";
import { CodePane } from "@/components/studio/code-pane";
import { SelectionToolbar } from "@/components/studio/selection-toolbar";
import { StudioHeader } from "@/components/studio/studio-header";
import { TranscriptTicker } from "@/components/studio/transcript-ticker";
import { VideoArtifact } from "@/components/studio/video-artifact";
import { YoutubePlayer } from "@/components/studio/youtube-player";
import { useHorizon } from "@/lib/hooks/use-horizon";
import { useReconstruction } from "@/lib/hooks/use-reconstruction";
import { useStudio } from "@/lib/store";
import { formatTime } from "@/lib/utils";

export function StudioV1({ videoId }: { videoId: string }) {
  useReconstruction(videoId);
  useHorizon(videoId);
  const rec = useStudio((s) => s.reconstruction);
  const videoTime = useStudio((s) => s.videoTime);
  const duration = useStudio((s) => s.duration || rec?.duration || 0);
  const requestSeek = useStudio((s) => s.requestSeek);
  const requestPlayback = useStudio((s) => s.requestPlayback);
  const setFollowVideo = useStudio((s) => s.setFollowVideo);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        requestPlayback("toggle");
        return;
      }
      if (e.key === "f" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setFollowVideo(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setFollowVideo, requestPlayback]);

  return (
    <div className="flex h-dvh flex-col bg-ink text-paper">
      <StudioHeader />
      <div className="min-h-0 flex-1">
        <div className="flex h-full min-h-0">
          <Group orientation="horizontal" className="min-h-0 flex-1">
            <Panel defaultSize="34%" minSize="24%">
              <div className="flex h-full min-h-0 flex-col bg-black">
                <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-black">
                  <YoutubePlayer videoId={videoId} />
                </div>
                <div className="flex items-center gap-2 bg-[#0b0d11] px-3 py-1.5">
                  <span className="w-10 font-mono text-[10px] text-mute">{formatTime(videoTime)}</span>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(duration, 1)}
                    step={0.1}
                    value={Math.min(videoTime, duration || videoTime)}
                    onChange={(e) => requestSeek(Number(e.target.value))}
                    className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-brass"
                  />
                  <span className="w-10 text-right font-mono text-[10px] text-mute">
                    {formatTime(duration)}
                  </span>
                </div>
                <TranscriptTicker />
                {rec && rec.status !== "ready" && (
                  <div className="border-t border-white/8 bg-[#141820] px-3 py-1.5 text-[11px] text-brass">
                    {rec.message}
                  </div>
                )}
                <div className="min-h-0 flex-1">
                  <VideoArtifact />
                </div>
              </div>
            </Panel>
            <Separator className="w-1.5 bg-white/8 hover:bg-brass/60" />
            <Panel defaultSize="66%" minSize="40%">
              <CodePane />
            </Panel>
          </Group>
          <AiDrawer />
        </div>
      </div>
      <SelectionToolbar />
    </div>
  );
}

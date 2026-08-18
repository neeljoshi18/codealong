"use client";

import { useEffect, useRef } from "react";
import { useStudio } from "@/lib/store";

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement | string,
        opts: Record<string, unknown>,
      ) => YtPlayer;
      PlayerState: { PLAYING: number; PAUSED: number; ENDED: number; BUFFERING: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YtPlayer {
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  seekTo: (s: number, allowSeekAhead: boolean) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  destroy: () => void;
}

let apiPromise: Promise<void> | null = null;

function loadApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve) => {
    const existing = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    if (!existing) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
    if (window.YT?.Player) resolve();
  });
  return apiPromise;
}

export function YoutubePlayer({ videoId }: { videoId: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YtPlayer | null>(null);
  const setVideoTime = useStudio((s) => s.setVideoTime);
  const setPlaying = useStudio((s) => s.setPlaying);
  const setPlayerReady = useStudio((s) => s.setPlayerReady);
  const setDuration = useStudio((s) => s.setDuration);

  useEffect(() => {
    let cancelled = false;
    let poll: number | undefined;
    let player: YtPlayer | null = null;

    void (async () => {
      await loadApi();
      if (cancelled || !hostRef.current || !window.YT) return;
      const mount = document.createElement("div");
      hostRef.current.innerHTML = "";
      hostRef.current.appendChild(mount);
      player = new window.YT.Player(mount, {
        videoId,
        width: "100%",
        height: "100%",
        playerVars: {
          autoplay: 1,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          enablejsapi: 1,
          disablekb: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            if (cancelled) return;
            playerRef.current = player;
            setPlayerReady(true);
            try {
              const iframe = (
                player as YtPlayer & { getIframe?: () => HTMLIFrameElement }
              ).getIframe?.();
              iframe?.setAttribute("tabindex", "-1");
              const d = player?.getDuration?.() ?? 0;
              if (d > 0) setDuration(d);
            } catch {
              /* ignore */
            }
          },
          onStateChange: (e: { data: number }) => {
            const playing = e.data === window.YT?.PlayerState.PLAYING;
            setPlaying(Boolean(playing));
          },
        },
      });

      const tick = () => {
        const p = playerRef.current;
        if (!p) return;
        try {
          const t = p.getCurrentTime();
          if (Number.isFinite(t)) setVideoTime(t);
          const d = p.getDuration();
          if (d > 0) setDuration(d);
        } catch {
          /* player torn down */
        }
      };
      poll = window.setInterval(tick, 50);
    })();

    return () => {
      cancelled = true;
      if (poll) window.clearInterval(poll);
      setPlayerReady(false);
      try {
        player?.destroy();
      } catch {
        /* ignore */
      }
      playerRef.current = null;
    };
  }, [videoId, setDuration, setPlayerReady, setPlaying, setVideoTime]);

  const seekToken = useStudio((s) => s.seekRequest?.token ?? 0);
  const seekTime = useStudio((s) => s.seekRequest?.time ?? 0);
  const playbackToken = useStudio((s) => s.playbackRequest?.token ?? 0);
  const playbackAction = useStudio((s) => s.playbackRequest?.action ?? "toggle");

  useEffect(() => {
    if (!seekToken) return;
    try {
      playerRef.current?.seekTo(seekTime, true);
    } catch {
      /* ignore */
    }
  }, [seekToken, seekTime]);

  useEffect(() => {
    if (!playbackToken) return;
    const p = playerRef.current;
    if (!p) return;
    try {
      if (playbackAction === "play") p.playVideo();
      else if (playbackAction === "pause") p.pauseVideo();
      else if (p.getPlayerState() === window.YT?.PlayerState.PLAYING) p.pauseVideo();
      else p.playVideo();
    } catch {
      /* ignore */
    }
  }, [playbackToken, playbackAction]);

  return <div ref={hostRef} className="absolute inset-0 overflow-hidden bg-black" />;
}

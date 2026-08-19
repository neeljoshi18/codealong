"use client";

import { useEffect, useState } from "react";
import { MEDIA_WINDOW_SEC } from "@/lib/media-window";
import { isSeeded } from "@/lib/seeds";
import { useStudio } from "@/lib/store";

type StatusPayload = {
  liveOcr?: boolean;
  message?: string;
  media?: { progress?: number; message?: string; full?: boolean };
};

export function useMediaCache(videoId: string) {
  const [progress, setProgress] = useState(isSeeded(videoId) ? 100 : 0);
  const [message, setMessage] = useState(isSeeded(videoId) ? "Ready" : "Checking this host…");
  const [full, setFull] = useState(isSeeded(videoId));
  const [liveOcr, setLiveOcr] = useState<boolean | null>(isSeeded(videoId) ? true : null);

  useEffect(() => {
    if (isSeeded(videoId)) {
      setProgress(100);
      setFull(true);
      setLiveOcr(true);
      setMessage("Ready");
      return;
    }

    let cancelled = false;
    let timer = 0;

    const apply = (data: StatusPayload) => {
      if (cancelled) return;
      if (data.liveOcr === false) {
        setLiveOcr(false);
        setProgress(100);
        setFull(false);
        setMessage(
          data.media?.message ||
            data.message ||
            "This host can't download videos. Featured demos work.",
        );
        return true;
      }
      setLiveOcr(true);
      const media = data.media;
      if (media) {
        setProgress(media.progress ?? 0);
        setMessage(media.message || data.message || "");
        setFull(Boolean(media.full));
      }
      return Boolean(media?.full);
    };

    const kick = (time: number) => {
      void fetch(`/api/videos/${videoId}/prepare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ time, full: false }),
      })
        .then((res) => res.json())
        .then((data: StatusPayload) => apply(data))
        .catch(() => undefined);
    };

    const poll = async () => {
      try {
        const t = useStudio.getState().videoTime;
        const res = await fetch(`/api/videos/${videoId}/status?t=${encodeURIComponent(String(t))}`);
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as StatusPayload;
        const done = apply(data);
        if (!cancelled && !done) timer = window.setTimeout(() => void poll(), 1500);
      } catch {
        if (!cancelled) timer = window.setTimeout(() => void poll(), 2500);
      }
    };

    kick(useStudio.getState().videoTime);
    void poll();

    const unsub = useStudio.subscribe((s, prev) => {
      if (cancelled || !prev) return;
      if (Math.floor(s.videoTime / MEDIA_WINDOW_SEC) !== Math.floor(prev.videoTime / MEDIA_WINDOW_SEC)) {
        kick(s.videoTime);
      }
    });

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      unsub();
    };
  }, [videoId]);

  return { progress, message, full, liveOcr };
}

"use client";

import { useEffect, useState } from "react";
import { subscribeClientMedia } from "@/lib/client-engine/status";
import { isSeeded } from "@/lib/seeds";

export function useMediaCache(videoId: string) {
  const [progress, setProgress] = useState(isSeeded(videoId) ? 100 : 0);
  const [message, setMessage] = useState(
    isSeeded(videoId) ? "Ready" : "This device will cache a compact copy in this tab…",
  );
  const [full, setFull] = useState(isSeeded(videoId));

  useEffect(() => {
    if (isSeeded(videoId)) {
      setProgress(100);
      setFull(true);
      setMessage("Ready");
      return;
    }

    let cancelled = false;
    const unsub = subscribeClientMedia((s) => {
      if (cancelled) return;
      if (s.message) {
        setProgress(s.progress);
        setMessage(s.message);
        setFull(s.full);
      }
    });

    void import("@/lib/client-engine/download")
      .then((m) => m.ensureClientVideo(videoId))
      .catch(() => {
        if (!cancelled) {
          setMessage("This browser couldn't fetch the file. Open the editor to try a local fallback.");
        }
      });

    const forget = () => {
      void import("@/lib/client-engine/opfs").then((m) => m.opfsForget(videoId));
    };
    window.addEventListener("pagehide", forget);

    return () => {
      cancelled = true;
      unsub();
      window.removeEventListener("pagehide", forget);
    };
  }, [videoId]);

  return { progress, message, full };
}

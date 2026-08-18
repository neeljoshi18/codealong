"use client";

import { useEffect, useRef } from "react";
import { isSeeded } from "@/lib/seeds";
import { useStudio } from "@/lib/store";
import type { VideoReconstruction } from "@/lib/types";

/** Tell the backend to keep ~3 minutes of reconstruction ahead of the playhead. */
export function useHorizon(videoId: string) {
  const patchReconstruction = useStudio((s) => s.patchReconstruction);
  const lastSent = useRef(-999);

  useEffect(() => {
    if (isSeeded(videoId)) return;

    const tick = async (time: number) => {
      if (Math.abs(time - lastSent.current) < 20) return;
      lastSent.current = time;
      try {
        const res = await fetch(`/api/videos/${videoId}/horizon`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ time }),
        });
        if (!res.ok) return;
        const data = (await res.json()) as { reconstruction?: VideoReconstruction };
        if (data.reconstruction) patchReconstruction(data.reconstruction);
      } catch {
        // ignore
      }
    };

    const id = window.setInterval(() => {
      const s = useStudio.getState();
      void tick(s.followVideo ? s.videoTime : s.codeTime);
    }, 4000);
    void tick(0);

    return () => window.clearInterval(id);
  }, [videoId, patchReconstruction]);
}

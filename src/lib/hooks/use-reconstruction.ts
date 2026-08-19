"use client";

import { useEffect } from "react";
import { emptyReconstruction } from "@/lib/reconstruction-stub";
import { useStudio } from "@/lib/store";
import type { ExperimentBranch, VideoReconstruction } from "@/lib/types";

export function useReconstruction(videoId: string) {
  const hydrate = useStudio((s) => s.hydrate);
  const patchReconstruction = useStudio((s) => s.patchReconstruction);
  const resetSession = useStudio((s) => s.resetSession);

  useEffect(() => {
    resetSession(videoId);
    if (useStudio.getState().reconstruction?.videoId !== videoId) {
      hydrate(videoId, emptyReconstruction(videoId), []);
    }
    let cancelled = false;
    let timer: number | undefined;

    async function pull() {
      try {
        const res = await fetch(`/api/videos/${videoId}/status`);
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          reconstruction?: VideoReconstruction;
        };
        if (cancelled || !data.reconstruction) return;
        patchReconstruction(data.reconstruction);
        const done = data.reconstruction.status === "ready" || data.reconstruction.status === "error";
        if (!done) timer = window.setTimeout(pull, 900);
      } catch {
        /* keep the stub */
      }
    }

    void (async () => {
      try {
        const res = await fetch(`/api/videos/${videoId}`);
        if (res.ok && !cancelled) {
          const data = (await res.json()) as { reconstruction: VideoReconstruction };
          const branches = await fetchBranches(videoId);
          if (cancelled) return;
          if (data.reconstruction) hydrate(videoId, data.reconstruction, branches);
        }
      } catch {
        /* stub already on screen */
      }
      if (cancelled) return;
      timer = window.setTimeout(pull, 1200);
    })();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [videoId, hydrate, patchReconstruction, resetSession]);
}

async function fetchBranches(videoId: string): Promise<ExperimentBranch[]> {
  try {
    const res = await fetch(`/api/branches?videoId=${videoId}`);
    if (!res.ok) return [];
    const data = (await res.json()) as { branches?: ExperimentBranch[] };
    return data.branches ?? [];
  } catch {
    return [];
  }
}

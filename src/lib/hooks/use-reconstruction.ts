"use client";

import { useEffect } from "react";
import { useStudio } from "@/lib/store";
import type { ExperimentBranch, VideoReconstruction } from "@/lib/types";

export function useReconstruction(videoId: string) {
  const hydrate = useStudio((s) => s.hydrate);
  const patchReconstruction = useStudio((s) => s.patchReconstruction);
  const resetSession = useStudio((s) => s.resetSession);

  useEffect(() => {
    resetSession(videoId);
    let cancelled = false;
    let timer: number | undefined;

    async function pull() {
      const res = await fetch(`/api/videos/${videoId}/status`);
      if (!res.ok || cancelled) return;
      const data = (await res.json()) as {
        reconstruction?: VideoReconstruction;
        ready?: boolean;
        status?: string;
      };
      if (cancelled || !data.reconstruction) return;
      const current = useStudio.getState().reconstruction;
      if (!current || current.videoId !== videoId) {
        const branches = await fetchBranches(videoId);
        if (cancelled) return;
        hydrate(videoId, data.reconstruction, branches);
      } else {
        patchReconstruction(data.reconstruction);
      }
      const done = data.reconstruction.status === "ready" || data.reconstruction.status === "error";
      if (!done) timer = window.setTimeout(pull, 900);
    }

    void (async () => {
      const res = await fetch(`/api/videos/${videoId}`);
      if (!res.ok || cancelled) return;
      const data = (await res.json()) as { reconstruction: VideoReconstruction };
      const branches = await fetchBranches(videoId);
      if (cancelled) return;
      hydrate(videoId, data.reconstruction, branches);
      if (data.reconstruction.status !== "ready") {
        timer = window.setTimeout(pull, 700);
        return;
      }
      // Seeds are ready instantly; keep polling briefly for live captions.
      let enrich = 0;
      const tick = async () => {
        if (cancelled || enrich++ > 10) return;
        const status = await fetch(`/api/videos/${videoId}/status`);
        if (!status.ok || cancelled) return;
        const next = (await status.json()) as { reconstruction?: VideoReconstruction };
        if (next.reconstruction) patchReconstruction(next.reconstruction);
        timer = window.setTimeout(() => void tick(), 1600);
      };
      timer = window.setTimeout(() => void tick(), 1200);
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

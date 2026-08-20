"use client";

import { useEffect, useRef } from "react";
import { formatTime } from "@/lib/utils";
import { readScreen } from "@/lib/read-screen";
import { useStudio } from "@/lib/store";

const INTERVAL_MS = 5000;

/**
 * While the editor is open, re-read the current video frame every 5s and
 * push a clean extract into Monaco. Pausing the video reads immediately
 * so the buffer matches whatever is on screen. Closing aborts in-flight.
 */
export function useLiveScreen(videoId: string) {
  const applyLiveSnapshot = useStudio((s) => s.applyLiveSnapshot);
  const patchReconstruction = useStudio((s) => s.patchReconstruction);
  const setLiveStatus = useStudio((s) => s.setLiveStatus);
  const beginLiveRead = useStudio((s) => s.beginLiveRead);
  const inFlight = useRef(false);
  const flightGen = useRef(0);

  useEffect(() => {
    let cancelled = false;
    let timer = 0;
    let abort: AbortController | null = null;

    const schedule = (ms: number, reason: "interval" | "pause" = "interval") => {
      window.clearTimeout(timer);
      if (cancelled) return;
      timer = window.setTimeout(() => void tick(reason), ms);
    };

    const tick = async (reason: "interval" | "pause") => {
      const state = useStudio.getState();
      if (cancelled) return;
      if (state.mode !== "experiment") {
        if (state.playing) schedule(INTERVAL_MS);
        return;
      }
      if (state.experimentDirty) {
        setLiveStatus(false, "Follow paused · you edited");
        if (state.playing) schedule(INTERVAL_MS);
        return;
      }
      if (inFlight.current && reason !== "pause") {
        schedule(INTERVAL_MS);
        return;
      }

      if (state.videoTime < 1.5 && state.experimentSourceTime > 8) {
        if (state.playing) schedule(INTERVAL_MS);
        return;
      }

      inFlight.current = true;
      const myFlight = ++flightGen.current;
      abort?.abort();
      abort = new AbortController();
      const t = state.videoTime;
      const seq = beginLiveRead();
      setLiveStatus(
        true,
        reason === "pause" ? `Paused · completing ${formatTime(t)}…` : `Reading screen at ${formatTime(t)}…`,
      );
      try {
        const data = await readScreen(videoId, t, {
          live: true,
          force: true,
          signal: abort.signal,
        });
        if (cancelled || useStudio.getState().mode !== "experiment") return;
        if (seq !== useStudio.getState().liveReadSeq) return;
        if (data.reconstruction) patchReconstruction(data.reconstruction);
        if (data.snapshot && !useStudio.getState().experimentDirty) {
          applyLiveSnapshot(data.snapshot, seq);
          const playing = useStudio.getState().playing;
          setLiveStatus(
            false,
            playing
              ? `Updated ${formatTime(data.snapshot.timestamp)} · next read in 5s`
              : `Paused · caught up to ${formatTime(data.snapshot.timestamp)}`,
          );
        } else {
          setLiveStatus(false, data.note || (useStudio.getState().playing ? "Next read in 5s" : "Paused"));
        }
      } catch (err) {
        if (cancelled || (err instanceof DOMException && err.name === "AbortError")) return;
        setLiveStatus(false, "Read failed · retrying in 5s");
      } finally {
        if (flightGen.current === myFlight) {
          inFlight.current = false;
          if (!cancelled && useStudio.getState().playing) schedule(INTERVAL_MS);
        }
      }
    };

    const unsub = useStudio.subscribe((s, prev) => {
      if (cancelled || !prev) return;
      const paused = prev.playing && !s.playing;
      const resumed = !prev.playing && s.playing;
      const jumped = Math.abs(s.videoTime - prev.videoTime) >= 1.2;
      if (paused && s.mode === "experiment" && !s.experimentDirty) {
        window.clearTimeout(timer);
        void tick("pause");
      } else if (resumed && s.mode === "experiment") {
        schedule(INTERVAL_MS);
      } else if (jumped && s.mode === "experiment" && !s.experimentDirty) {
        window.clearTimeout(timer);
        schedule(350, "pause");
      }
    });

    schedule(INTERVAL_MS);
    return () => {
      cancelled = true;
      abort?.abort();
      window.clearTimeout(timer);
      unsub();
    };
  }, [videoId, applyLiveSnapshot, beginLiveRead, patchReconstruction, setLiveStatus]);
}

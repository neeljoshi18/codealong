import { isUsableSnapshot } from "@/lib/pipeline/code-from-ocr";
import { isSeeded } from "@/lib/seeds";
import type { CodeSnapshot, VideoReconstruction } from "@/lib/types";

export type ScreenRead = {
  reconstruction?: VideoReconstruction;
  snapshot: CodeSnapshot | null;
  cached?: boolean;
  note?: string;
  error?: string;
  liveOcr?: boolean;
  skipped?: boolean;
};

async function readOnServer(
  videoId: string,
  time: number,
  opts?: { live?: boolean; force?: boolean; signal?: AbortSignal },
): Promise<ScreenRead> {
  const res = await fetch(`/api/videos/${videoId}/capture`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      time,
      live: Boolean(opts?.live),
      force: Boolean(opts?.force),
    }),
    signal: opts?.signal,
  });
  const data = (await res.json()) as ScreenRead;
  const snap = data.snapshot && isUsableSnapshot(data.snapshot) ? data.snapshot : null;
  return { ...data, snapshot: snap };
}

async function readOnDevice(
  videoId: string,
  time: number,
  rec: VideoReconstruction | null,
  signal?: AbortSignal,
): Promise<ScreenRead | null> {
  const { opfsHas } = await import("@/lib/client-engine/opfs");
  if (!(await opfsHas(videoId))) return null;
  const { captureInBrowser } = await import("@/lib/client-engine/capture");
  const data = await captureInBrowser(videoId, time, rec, signal);
  const snap = data.snapshot && isUsableSnapshot(data.snapshot) ? data.snapshot : null;
  return snap ? { snapshot: snap, cached: data.cached } : null;
}

export async function readScreen(
  videoId: string,
  time: number,
  opts?: { live?: boolean; force?: boolean; signal?: AbortSignal },
): Promise<ScreenRead> {
  const rec =
    typeof window === "undefined"
      ? null
      : (await import("@/lib/store")).useStudio.getState().reconstruction;

  const tryDevice = async () => {
    try {
      return await readOnDevice(videoId, time, rec, opts?.signal);
    } catch {
      return null;
    }
  };
  const tryServer = async () => {
    try {
      return await readOnServer(videoId, time, opts);
    } catch {
      return null;
    }
  };

  // Never wait on a browser YouTube download (CORS). Only OCR locally if
  // this tab already has the file. Otherwise go straight to the server.
  if (!isSeeded(videoId)) {
    const device = await tryDevice();
    if (device?.snapshot) return device;
    const server = await tryServer();
    if (server) return server;
    return {
      snapshot: null,
      note: "Couldn't read this frame. Retrying…",
    };
  }

  const server = await tryServer();
  if (server?.snapshot) return server;
  const device = await tryDevice();
  if (device?.snapshot) return device;
  return server ?? { snapshot: null, note: "Couldn't read this frame." };
}

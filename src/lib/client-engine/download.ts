import { opfsHas, opfsWrite } from "@/lib/client-engine/opfs";
import { setClientMediaStatus } from "@/lib/client-engine/status";

const jobs = new Map<string, Promise<void>>();

export async function ensureClientVideo(videoId: string, timeoutMs = 8_000): Promise<void> {
  if (await opfsHas(videoId)) {
    setClientMediaStatus({ progress: 100, message: "Cached on this device", full: true });
    return;
  }
  const existing = jobs.get(videoId);
  const job = existing ?? download(videoId).finally(() => jobs.delete(videoId));
  if (!existing) jobs.set(videoId, job);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      job,
      new Promise<void>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Client download timed out")), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function download(videoId: string): Promise<void> {
  setClientMediaStatus({ progress: 4, message: "Resolving the video on this device…", full: false });
  const { Innertube, Platform } = await import("youtubei.js/web");
  Platform.shim.eval = (data) => new Function(data.output)();
  const yt = await Innertube.create({
    generate_session_locally: true,
    retrieve_player: true,
  });
  const info = await yt.getInfo(videoId);
  setClientMediaStatus({ progress: 8, message: "Downloading a compact copy into this tab…", full: false });
  const stream = await info.download({
    type: "video+audio",
    quality: "360p",
    format: "mp4",
  });
  await opfsWrite(videoId, stream, (written) => {
    setClientMediaStatus({
      progress: Math.min(96, 8 + Math.round(written / 2_000_000)),
      message: `Caching on this device… ${Math.round(written / 1_000_000)} MB`,
      full: false,
    });
  });
  setClientMediaStatus({ progress: 100, message: "Cached on this device", full: true });
}

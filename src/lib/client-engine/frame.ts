import { opfsRead } from "@/lib/client-engine/opfs";

/** Seek a same-origin blob and paint one frame. No ffmpeg.wasm, no tainted canvas. */
export async function extractPngFrame(videoId: string, time: number): Promise<Blob> {
  const file = await opfsRead(videoId);
  if (!file) throw new Error("No cached video on this device.");
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = url;
    await new Promise<void>((resolve, reject) => {
      const fail = () => reject(new Error("Could not load the cached video."));
      video.onloadedmetadata = () => resolve();
      video.onerror = fail;
    });
    const target = Math.min(Math.max(0, time), Number.isFinite(video.duration) ? video.duration - 0.05 : time);
    await new Promise<void>((resolve, reject) => {
      video.onseeked = () => resolve();
      video.onerror = () => reject(new Error("Could not seek the cached video."));
      video.currentTime = target;
    });
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 360;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No canvas.");
    ctx.drawImage(video, 0, 0);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not encode the frame."))), "image/png");
    });
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

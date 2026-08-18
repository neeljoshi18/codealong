import { getCachedReconstruction } from "@/lib/db";
import { getSeed } from "@/lib/seeds";
import { isCleanCode } from "@/lib/pipeline/code-from-ocr";
import { insertSnapshot } from "@/lib/pipeline/ingest";
import { captureScreenAt, captureToolchain, nearbyOcrSnapshot } from "@/lib/pipeline/screen-capture";

export const maxDuration = 180;

export async function POST(
  request: Request,
  ctx: { params: Promise<{ videoId: string }> },
) {
  const { videoId } = await ctx.params;
  const body = (await request.json().catch(() => ({}))) as { time?: number };
  const time = Number.isFinite(body.time) ? Math.max(0, Number(body.time)) : 0;

  const rec = getCachedReconstruction(videoId) ?? getSeed(videoId);
  if (!rec) {
    return Response.json({ error: "Unknown video. Open it once first." }, { status: 404 });
  }

  const close = nearbyOcrSnapshot(rec.snapshots, time, 70);
  if (close && isCleanSnapshot(close)) {
    return Response.json({ reconstruction: rec, snapshot: close, cached: true });
  }

  const tools = captureToolchain();
  if (!tools.ffmpeg || !tools.tesseract) {
    return Response.json({
      reconstruction: rec,
      snapshot: null,
      skipped: true,
      error: "Install ffmpeg and tesseract to read the screen. Featured seeds stay estimates until then.",
    });
  }

  try {
    const snapshot = await captureScreenAt({
      videoId,
      time,
      language: rec.language,
      cues: rec.transcript,
    });
    const next = insertSnapshot(videoId, snapshot) ?? { ...rec, snapshots: [...rec.snapshots, snapshot] };
    return Response.json({ reconstruction: next, snapshot, cached: false });
  } catch (err) {
    const fallback = nearbyOcrSnapshot(rec.snapshots, time, 90);
    if (fallback && isCleanSnapshot(fallback)) {
      return Response.json({
        reconstruction: rec,
        snapshot: fallback,
        cached: true,
        note: "This frame was too noisy; using the nearest clean extract.",
      });
    }
    return Response.json({
      reconstruction: rec,
      snapshot: fallback,
      error: err instanceof Error ? err.message : String(err),
    }, { status: 200 });
  }
}

function isCleanSnapshot(snap: { files: Record<string, string>; activeFile: string }): boolean {
  const text = snap.files[snap.activeFile] ?? Object.values(snap.files)[0] ?? "";
  return isCleanCode(text);
}

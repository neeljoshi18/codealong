import { isCleanSnapshot, isUsableSnapshot, snapshotSource } from "@/lib/pipeline/code-from-ocr";
import { previousSameFile, recoverCutoff, significantLines } from "@/lib/pipeline/code-story";
import { insertSnapshot } from "@/lib/pipeline/ingest";
import { reconstructionForVideo } from "@/lib/pipeline/run";
import { captureScreenAt, captureToolchain, nearbyOcrSnapshot } from "@/lib/pipeline/screen-capture";
import { snapshotAt } from "@/lib/snapshots";

export const maxDuration = 180;

export async function POST(
  request: Request,
  ctx: { params: Promise<{ videoId: string }> },
) {
  const { videoId } = await ctx.params;
  const body = (await request.json().catch(() => ({}))) as {
    time?: number;
    live?: boolean;
    force?: boolean;
  };
  const time = Number.isFinite(body.time) ? Math.max(0, Number(body.time)) : 0;
  const live = Boolean(body.live);
  const force = Boolean(body.force);

  const rec = reconstructionForVideo(videoId);
  if (!rec) {
    return Response.json({ error: "Unknown video. Open it once first." }, { status: 404 });
  }

  const fallback = () =>
    nearbyOcrSnapshot(rec.snapshots, time, live ? 4 : 8) ?? snapshotAt(rec.snapshots, time);

  if (!force) {
    const close = nearbyOcrSnapshot(rec.snapshots, time, live ? 4 : 12);
    if (close) {
      return Response.json({ reconstruction: rec, snapshot: close, cached: true });
    }
  }

  const tools = captureToolchain();
  if (!tools.ffmpeg || !tools.tesseract) {
    return Response.json({
      reconstruction: rec,
      snapshot: fallback(),
      skipped: true,
      note: "Showing the nearest known code.",
    });
  }

  try {
    let snapshot = await captureScreenAt({
      videoId,
      time,
      language: rec.language,
      cues: rec.transcript,
    });
    if (!isUsableSnapshot(snapshot)) {
      throw new Error("FRAME_NOT_CODE");
    }
    const prior = previousSameFile(rec.snapshots, time, snapshot.activeFile);
    const priorText = prior
      ? (prior.files[snapshot.activeFile] ?? snapshotSource(prior))
      : undefined;
    if (priorText) {
      const recovered = recoverCutoff(snapshotSource(snapshot), priorText);
      snapshot = {
        ...snapshot,
        files: { ...snapshot.files, [snapshot.activeFile]: recovered.code },
        label: recovered.recovered ? `${snapshot.label} · filled from earlier frame` : snapshot.label,
      };
    }
    const recoveredText = snapshotSource(snapshot);
    const priorSig = priorText ? significantLines(priorText).length : 0;
    const nextSig = significantLines(recoveredText).length;
    const worse = priorSig > 0 && nextSig < priorSig * 0.85;
    const persist = isCleanSnapshot(snapshot) && !worse;
    const next = persist
      ? (insertSnapshot(videoId, snapshot) ?? { ...rec, snapshots: [...rec.snapshots, snapshot] })
      : rec;
    return Response.json({ reconstruction: next, snapshot, cached: false });
  } catch {
    return Response.json({
      reconstruction: rec,
      snapshot: fallback(),
      cached: true,
      note: "Couldn't read this frame; using the nearest known code.",
    });
  }
}

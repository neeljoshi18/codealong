import { isCleanSnapshot, isUsableSnapshot, snapshotSource } from "@/lib/pipeline/code-from-ocr";
import { previousSameFile, recoverCutoff, significantLines } from "@/lib/pipeline/code-story";
import { insertSnapshot } from "@/lib/pipeline/ingest";
import { canLiveOcr } from "@/lib/pipeline/binaries";
import { loadOrStart, reconstructionForVideo } from "@/lib/pipeline/run";
import { captureScreenAt, captureToolchain, nearbyOcrSnapshot } from "@/lib/pipeline/screen-capture";
import { snapshotAt } from "@/lib/snapshots";

export const maxDuration = 90;

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

  const rec = reconstructionForVideo(videoId) ?? (await loadOrStart(videoId));

  const fallback = () =>
    nearbyOcrSnapshot(rec.snapshots, time, live ? 4 : 8) ?? snapshotAt(rec.snapshots, time);

  if (!force) {
    const close = nearbyOcrSnapshot(rec.snapshots, time, live ? 4 : 12);
    if (close) {
      return Response.json({ reconstruction: rec, snapshot: close, cached: true });
    }
  }

  const tools = captureToolchain();
  if (!tools.ffmpeg || !tools.tesseract || !canLiveOcr()) {
    return Response.json({
      reconstruction: rec,
      snapshot: fallback(),
      skipped: true,
      liveOcr: false,
      note:
        fallback()
          ? "Showing the nearest known code."
          : "This host can't download the video (Vercel has no ffmpeg). Featured demos work. Any other link needs local next dev or the droplet.",
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
  } catch (err) {
    const snap = fallback();
    const reason = err instanceof Error ? err.message : "";
    const emptyNote =
      reason === "FRAME_NOT_CODE"
        ? "This frame doesn't look like a code editor. Pause when the file is on screen."
        : "Couldn't fetch this moment yet. Retry in a few seconds.";
    return Response.json({
      reconstruction: rec,
      snapshot: snap,
      cached: true,
      note: snap ? "Couldn't read this frame; using the nearest known code." : emptyNote,
    });
  }
}

import { after } from "next/server";
import { getCachedReconstruction, getJob } from "@/lib/db";
import { getSeed } from "@/lib/seeds";
import { ensureHorizon } from "@/lib/pipeline/run";

export const maxDuration = 120;

export async function POST(
  request: Request,
  ctx: { params: Promise<{ videoId: string }> },
) {
  const { videoId } = await ctx.params;
  if (getSeed(videoId)) {
    const rec = getCachedReconstruction(videoId) ?? getSeed(videoId);
    return Response.json({ videoId, reconstruction: rec, job: getJob(videoId) });
  }

  const body = (await request.json().catch(() => ({}))) as { time?: number };
  const time = Number.isFinite(body.time) ? Math.max(0, Number(body.time)) : 0;

  after(() => {
    void ensureHorizon(videoId, time);
  });

  const rec = getCachedReconstruction(videoId);
  return Response.json({
    videoId,
    reconstruction: rec,
    job: getJob(videoId),
    requested: time,
  });
}

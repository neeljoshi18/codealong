import { after } from "next/server";
import { getJob } from "@/lib/db";
import { getSeed } from "@/lib/seeds";
import { ensureHorizon, loadOrStart } from "@/lib/pipeline/run";

export const maxDuration = 300;

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ videoId: string }> },
) {
  const { videoId } = await ctx.params;
  const rec = await loadOrStart(videoId);

  if (!getSeed(videoId) && rec.status !== "ready") {
    after(() => {
      void ensureHorizon(videoId, 0);
    });
  }

  return Response.json({
    videoId,
    reconstruction: rec,
    job: getJob(videoId) ?? {
      videoId,
      status: rec.status,
      progress: rec.progress,
      message: rec.message,
    },
  });
}

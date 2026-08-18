import { getCachedReconstruction, getJob } from "@/lib/db";
import { getSeed } from "@/lib/seeds";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ videoId: string }> },
) {
  const { videoId } = await ctx.params;
  const seed = getSeed(videoId);
  const rec = getCachedReconstruction(videoId) ?? seed;
  const job = getJob(videoId);
  return Response.json({
    videoId,
    status: job?.status ?? rec?.status ?? "idle",
    progress: job?.progress ?? rec?.progress ?? 0,
    message: job?.message ?? rec?.message ?? "",
    snapshotCount: rec?.snapshots.length ?? 0,
    ready: rec?.status === "ready" && (rec?.snapshots.length ?? 0) > 0,
    reconstruction: rec,
  });
}

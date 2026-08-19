import { after } from "next/server";
import { getJob } from "@/lib/db";
import { canLiveOcr } from "@/lib/pipeline/binaries";
import { loadOrStart, refreshMetadata } from "@/lib/pipeline/run";
import { emptyReconstruction } from "@/lib/reconstruction-stub";

export const maxDuration = 15;
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ videoId: string }> },
) {
  const { videoId } = await ctx.params;
  try {
    const rec = await loadOrStart(videoId);
    after(() => {
      void refreshMetadata(videoId);
    });
    return Response.json({
      videoId,
      reconstruction: rec,
      liveOcr: canLiveOcr(),
      job: getJob(videoId) ?? {
        videoId,
        status: rec.status,
        progress: rec.progress,
        message: rec.message,
      },
    });
  } catch (err) {
    const rec = emptyReconstruction(videoId);
    rec.message = err instanceof Error ? err.message : rec.message;
    return Response.json({
      videoId,
      reconstruction: rec,
      liveOcr: canLiveOcr(),
      job: {
        videoId,
        status: rec.status,
        progress: rec.progress,
        message: rec.message,
      },
    });
  }
}

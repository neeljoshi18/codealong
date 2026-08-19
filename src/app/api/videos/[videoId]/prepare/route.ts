import { after } from "next/server";
import { getJob } from "@/lib/db";
import { canLiveOcr } from "@/lib/pipeline/binaries";
import { ensureFullVideo, ensureWindow, mediaStatus } from "@/lib/pipeline/media";
import { isEphemeralHost } from "@/lib/paths";
import { loadOrStart, reconstructionForVideo } from "@/lib/pipeline/run";
import { isSeeded } from "@/lib/seeds";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  ctx: { params: Promise<{ videoId: string }> },
) {
  const { videoId } = await ctx.params;
  const body = (await request.json().catch(() => ({}))) as { time?: number; full?: boolean };
  const time = Number.isFinite(body.time) ? Math.max(0, Number(body.time)) : 0;

  if (isSeeded(videoId)) {
    return Response.json({
      videoId,
      seeded: true,
      liveOcr: canLiveOcr(),
      media: mediaStatus(videoId, time),
      job: getJob(videoId),
    });
  }

  void loadOrStart(videoId);

  if (!isEphemeralHost() && canLiveOcr()) {
    after(() => {
      void ensureWindow(videoId, time).catch(() => undefined);
      if (body.full !== false) void ensureFullVideo(videoId).catch(() => undefined);
    });
  }

  return Response.json({
    videoId,
    seeded: false,
    liveOcr: canLiveOcr(),
    media: mediaStatus(videoId, time),
    reconstruction: reconstructionForVideo(videoId),
    job: getJob(videoId),
  });
}

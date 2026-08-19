import { after } from "next/server";
import { getJob } from "@/lib/db";
import { ensureFullVideo, ensureWindow, mediaStatus } from "@/lib/pipeline/media";
import { reconstructionForVideo } from "@/lib/pipeline/run";
import { isSeeded } from "@/lib/seeds";

export const maxDuration = 180;

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
      media: mediaStatus(videoId, time),
      job: getJob(videoId),
    });
  }

  after(() => {
    void ensureWindow(videoId, time).catch(() => undefined);
    if (body.full !== false) void ensureFullVideo(videoId).catch(() => undefined);
  });

  return Response.json({
    videoId,
    seeded: false,
    media: mediaStatus(videoId, time),
    reconstruction: reconstructionForVideo(videoId),
    job: getJob(videoId),
  });
}

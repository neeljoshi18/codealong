import { proxyCaptureIfNeeded } from "@/lib/capture-backend";
import { getJob } from "@/lib/db";
import { canLiveOcr } from "@/lib/pipeline/binaries";
import { mediaCookieInfo, mediaStatus } from "@/lib/pipeline/media";
import { reconstructionForVideo } from "@/lib/pipeline/run";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  ctx: { params: Promise<{ videoId: string }> },
) {
  const { videoId } = await ctx.params;
  const proxied = await proxyCaptureIfNeeded(request, `/api/videos/${videoId}/status`);
  if (proxied) return proxied;
  const rec = reconstructionForVideo(videoId);
  const job = getJob(videoId);
  const url = new URL(request.url);
  const t = Number(url.searchParams.get("t") ?? 0);
  const media = mediaStatus(videoId, Number.isFinite(t) ? t : 0);
  return Response.json({
    videoId,
    status: job?.status ?? rec?.status ?? "idle",
    progress: media.full ? 100 : media.progress || job?.progress || rec?.progress || 0,
    message: media.message || job?.message || rec?.message || "",
    snapshotCount: rec?.snapshots.length ?? 0,
    ready: Boolean(rec),
    liveOcr: canLiveOcr(),
    cookies: mediaCookieInfo(),
    media,
    reconstruction: rec,
  });
}

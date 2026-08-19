import { forgetMedia } from "@/lib/pipeline/media";
import { isSeeded } from "@/lib/seeds";

export async function POST(
  _request: Request,
  ctx: { params: Promise<{ videoId: string }> },
) {
  const { videoId } = await ctx.params;
  if (isSeeded(videoId)) {
    return Response.json({ videoId, deleted: [], kept: true });
  }
  const result = forgetMedia(videoId);
  return Response.json({ videoId, ...result });
}

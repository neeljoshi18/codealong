import { after } from "next/server";
import { extractVideoId } from "@/lib/youtube";
import { getJob } from "@/lib/db";
import { canLiveOcr } from "@/lib/pipeline/binaries";
import { loadOrStart, refreshMetadata } from "@/lib/pipeline/run";

export const maxDuration = 15;
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { url?: string; videoId?: string };
  const videoId = body.videoId || (body.url ? extractVideoId(body.url) : null);
  if (!videoId) {
    return Response.json({ error: "Could not parse a YouTube video ID from that URL." }, { status: 400 });
  }

  const rec = await loadOrStart(videoId);
  after(() => {
    void refreshMetadata(videoId);
  });
  return Response.json({
    videoId,
    reconstruction: rec,
    liveOcr: canLiveOcr(),
    job: getJob(videoId),
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("url") ?? url.searchParams.get("id");
  if (!q) return Response.json({ error: "url or id required" }, { status: 400 });
  const videoId = extractVideoId(q) ?? q;
  const rec = await loadOrStart(videoId);
  return Response.json({
    videoId,
    reconstruction: rec,
    liveOcr: canLiveOcr(),
    job: getJob(videoId),
  });
}

import { after } from "next/server";
import { extractVideoId } from "@/lib/youtube";
import { getCachedReconstruction, getJob, upsertJob } from "@/lib/db";
import { getSeed } from "@/lib/seeds";
import { ensureHorizon, loadOrStart } from "@/lib/pipeline/run";

export const maxDuration = 300;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { url?: string; videoId?: string };
  const videoId = body.videoId || (body.url ? extractVideoId(body.url) : null);
  if (!videoId) {
    return Response.json({ error: "Could not parse a YouTube video ID from that URL." }, { status: 400 });
  }

  const seed = getSeed(videoId);
  const cached = getCachedReconstruction(videoId);
  if (seed || (cached && cached.status === "ready")) {
    const rec = await loadOrStart(videoId);
    return Response.json({ videoId, reconstruction: rec, job: getJob(videoId) });
  }

  upsertJob(videoId, { status: "queued", progress: 1, message: "Queued" });
  after(() => {
    void ensureHorizon(videoId, 0);
  });

  const rec = cached ?? (await loadOrStart(videoId).catch(() => null));
  return Response.json({ videoId, reconstruction: rec, job: getJob(videoId) });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("url") ?? url.searchParams.get("id");
  if (!q) return Response.json({ error: "url or id required" }, { status: 400 });
  const videoId = extractVideoId(q) ?? q;
  const rec = await loadOrStart(videoId);
  return Response.json({ videoId, reconstruction: rec, job: getJob(videoId) });
}

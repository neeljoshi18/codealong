import { listBranches, saveBranch } from "@/lib/db";
import type { ExperimentBranch } from "@/lib/types";

export async function GET(request: Request) {
  const videoId = new URL(request.url).searchParams.get("videoId");
  if (!videoId) return Response.json({ error: "videoId required" }, { status: 400 });
  return Response.json({ branches: listBranches(videoId) });
}

export async function POST(request: Request) {
  const branch = (await request.json()) as ExperimentBranch;
  if (!branch?.videoId || !branch.files || !branch.name) {
    return Response.json({ error: "invalid branch" }, { status: 400 });
  }
  const branches = saveBranch(branch);
  return Response.json({ branches });
}

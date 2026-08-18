import JSZip from "jszip";
import { getCachedReconstruction } from "@/lib/db";
import { getSeed } from "@/lib/seeds";
import { snapshotAt } from "@/lib/snapshots";

export async function GET(
  request: Request,
  ctx: { params: Promise<{ videoId: string }> },
) {
  const { videoId } = await ctx.params;
  const rec = getCachedReconstruction(videoId) ?? getSeed(videoId);
  if (!rec || rec.snapshots.length === 0) {
    return Response.json({ error: "No reconstructed codebase yet." }, { status: 404 });
  }

  const url = new URL(request.url);
  const at = url.searchParams.get("at") ?? "final";
  const t = Number(url.searchParams.get("t") ?? rec.duration);
  const snap =
    at === "current" ? snapshotAt(rec.snapshots, Number.isFinite(t) ? t : rec.duration) : rec.snapshots.at(-1);

  if (!snap) {
    return Response.json({ error: "No snapshot at that time." }, { status: 404 });
  }

  const zip = new JSZip();
  const root = `codechronos-${videoId}`;
  for (const [name, content] of Object.entries(snap.files)) {
    zip.file(`${root}/${name}`, content);
  }
  zip.file(
    `${root}/CODECHRONOS.md`,
    `# ${rec.title}\n\nReconstructed from https://www.youtube.com/watch?v=${videoId}\nTimestamp: ${snap.timestamp}s (${snap.label})\nLanguage: ${snap.language}\n\n${rec.tutorialGoalSummary}\n`,
  );

  const bytes = await zip.generateAsync({ type: "uint8array" });
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${root}.zip"`,
    },
  });
}

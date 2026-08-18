import { getCachedReconstruction, saveReconstruction } from "@/lib/db";
import { mergeSnapshotStreams } from "@/lib/pipeline/consolidate";
import type { CodeSnapshot, VideoReconstruction } from "@/lib/types";

export function insertSnapshot(videoId: string, snap: CodeSnapshot): VideoReconstruction | null {
  const rec = getCachedReconstruction(videoId);
  if (!rec) return null;
  const withoutNear = rec.snapshots.filter(
    (s) => !(s.origin && s.origin !== "seed" && Math.abs(s.timestamp - snap.timestamp) < 1.5),
  );
  rec.snapshots = mergeSnapshotStreams(withoutNear, [snap]);
  rec.source = "ocr";
  rec.message = `Screen extract at ${Math.floor(snap.timestamp)}s`;
  rec.processedAt = new Date().toISOString();
  saveReconstruction(rec);
  return rec;
}

import { getCachedReconstruction, saveReconstruction } from "@/lib/db";
import { isCleanSnapshot, isUsableSnapshot } from "@/lib/pipeline/code-from-ocr";
import { classifyTutorial } from "@/lib/pipeline/code-story";
import { mergeSnapshotStreams } from "@/lib/pipeline/consolidate";
import type { CodeSnapshot, VideoReconstruction } from "@/lib/types";

export function insertSnapshot(videoId: string, snap: CodeSnapshot): VideoReconstruction | null {
  const rec = getCachedReconstruction(videoId);
  if (!rec) return null;
  if (!isUsableSnapshot(snap) && !isCleanSnapshot(snap)) return rec;
  const withoutNear = rec.snapshots.filter(
    (s) => !(s.origin && s.origin !== "seed" && Math.abs(s.timestamp - snap.timestamp) < 1.5),
  );
  rec.snapshots = mergeSnapshotStreams(withoutNear, [snap]);
  rec.source = "ocr";
  rec.language = rec.language === "plaintext" ? snap.language : rec.language;
  rec.tutorialKind = classifyTutorial(rec.snapshots).kind;
  rec.message = `Screen extract at ${Math.floor(snap.timestamp)}s`;
  rec.processedAt = new Date().toISOString();
  saveReconstruction(rec);
  return rec;
}

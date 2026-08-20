import { snapshotSource } from "@/lib/pipeline/code-from-ocr";
import { sameExample } from "@/lib/pipeline/code-story";
import { filesFingerprint } from "@/lib/utils";
import type { CodeSnapshot } from "@/lib/types";

export function consolidateSnapshots(input: CodeSnapshot[]): CodeSnapshot[] {
  const sorted = [...input].sort((a, b) => a.timestamp - b.timestamp);
  const out: CodeSnapshot[] = [];
  let lastFp = "";
  let lastTs = -Infinity;

  for (const snap of sorted) {
    const fp = filesFingerprint(snap.files);
    const tooClose = snap.timestamp - lastTs < 0.75 && fp === lastFp;
    if (fp === lastFp && tooClose) continue;
    if (fp === lastFp && out.length > 0 && snap.timestamp - lastTs < 8) {
      if (out[out.length - 1].label === snap.label) continue;
    }
    out.push(snap);
    lastFp = fp;
    lastTs = snap.timestamp;
  }
  return out;
}

export function mergeSnapshotStreams(
  primary: CodeSnapshot[],
  overlay: CodeSnapshot[],
): CodeSnapshot[] {
  if (overlay.length === 0) return consolidateSnapshots(primary);
  if (primary.length === 0) return consolidateSnapshots(overlay);

  // Prefer overlay (vision) at nearby timestamps; keep primary for density.
  const merged = [...primary];
  for (const vis of overlay) {
    const near = merged.findIndex((s) => Math.abs(s.timestamp - vis.timestamp) < 2);
    if (near >= 0) {
      const existing = merged[near];
      const related = sameExample(snapshotSource(existing), snapshotSource(vis));
      merged[near] = {
        ...existing,
        ...vis,
        id: existing.id,
        files: related ? { ...existing.files, ...vis.files } : { ...vis.files },
        label: vis.label || existing.label,
      };
    } else {
      merged.push(vis);
    }
  }
  return consolidateSnapshots(merged);
}

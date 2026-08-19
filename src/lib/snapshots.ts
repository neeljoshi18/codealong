import type { CodeSnapshot } from "@/lib/types";

export function findSnapshotIndex(snapshots: CodeSnapshot[], time: number): number {
  if (snapshots.length === 0) return -1;
  let lo = 0;
  let hi = snapshots.length - 1;
  let ans = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (snapshots[mid].timestamp <= time) {
      ans = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return ans;
}

export function snapshotAt(snapshots: CodeSnapshot[], time: number): CodeSnapshot | null {
  const i = findSnapshotIndex(snapshots, time);
  return i >= 0 ? snapshots[i] : null;
}

export function nearestSnapshot(snapshots: CodeSnapshot[], time: number): CodeSnapshot | null {
  if (snapshots.length === 0) return null;
  let best = snapshots[0];
  let bestD = Math.abs(best.timestamp - time);
  for (const snap of snapshots) {
    const d = Math.abs(snap.timestamp - time);
    if (d < bestD) {
      best = snap;
      bestD = d;
    }
  }
  return best;
}

export interface SnapshotSectionStep {
  dt?: number;
  body: string;
  extraFiles?: Record<string, string>;
  file?: string;
}

export interface SnapshotSection {
  t: number;
  label: string;
  file?: string;
  language?: string;
  steps: SnapshotSectionStep[];
}

export function buildStitchedSnapshots(opts: {
  language: string;
  defaultFile: string;
  stitchFile?: string;
  sections: SnapshotSection[];
}): CodeSnapshot[] {
  const stitchName = opts.stitchFile ?? "tutorial.py";
  const snapshots: CodeSnapshot[] = [];
  const completed: string[] = [];
  let seq = 0;

  for (const section of opts.sections) {
    let lastBody = "";
    const extras: Record<string, string> = {};

    for (const step of section.steps) {
      lastBody = step.body;
      if (step.extraFiles) Object.assign(extras, step.extraFiles);
      const active = step.file ?? section.file ?? opts.defaultFile;
      const files: Record<string, string> = {
        [active]: step.body,
        ...extras,
      };
      if (completed.length > 0) {
        files[stitchName] = completed.join("\n\n");
      }
      snapshots.push({
        id: `s${String(++seq).padStart(4, "0")}`,
        timestamp: section.t + (step.dt ?? 0),
        language: section.language ?? opts.language,
        activeFile: active,
        files,
        label: section.label,
        origin: "seed",
      });
    }

    const header = `# --- ${section.label} (${formatStamp(section.t)}) ---`;
    completed.push(`${header}\n${lastBody.trimEnd()}`);
  }

  snapshots.sort((a, b) => a.timestamp - b.timestamp);

  if (snapshots.length > 0 && completed.length > 0) {
    const last = snapshots[snapshots.length - 1];
    snapshots.push({
      ...last,
      id: `s${String(++seq).padStart(4, "0")}`,
      timestamp: last.timestamp + 0.5,
      files: {
        ...last.files,
        [stitchName]: completed.join("\n\n") + "\n",
      },
      label: "Final reconstructed codebase",
    });
  }

  return snapshots;
}

function formatStamp(seconds: number): string {
  const s = Math.floor(seconds);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec < 10 ? "0" : ""}${sec}`;
}

export function collectAllFiles(snapshots: CodeSnapshot[]): string[] {
  const set = new Set<string>();
  for (const snap of snapshots) {
    for (const name of Object.keys(snap.files)) set.add(name);
  }
  return [...set].sort();
}

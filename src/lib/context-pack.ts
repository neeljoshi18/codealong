import { multiFileDiff, flattenFiles } from "@/lib/diff-text";
import { snapshotAt } from "@/lib/snapshots";
import { windowTranscript } from "@/lib/transcript-window";
import type { AiContextPack, VideoReconstruction } from "@/lib/types";

export function packContext(opts: {
  reconstruction: VideoReconstruction;
  timestamp: number;
  userFiles?: Record<string, string>;
  selectedText?: string;
  activeFile?: string;
}): AiContextPack {
  const { reconstruction: rec, timestamp } = opts;
  const snap = snapshotAt(rec.snapshots, timestamp);
  const originalFiles = snap?.files ?? {};
  const userFiles = opts.userFiles ?? originalFiles;
  const active = opts.activeFile ?? snap?.activeFile;
  const originalCode = flattenFiles(originalFiles, active);
  const userCode = flattenFiles(userFiles, active);

  return {
    videoId: rec.videoId,
    currentTimestamp: timestamp,
    transcriptWindow: windowTranscript(rec.transcript, timestamp, 40),
    originalCodeAtTime: originalCode,
    userCode,
    diff: multiFileDiff(originalFiles, userFiles),
    language: snap?.language ?? rec.language,
    inferredProjectStructure: rec.inferredProjectStructure,
    tutorialGoalSummary: rec.tutorialGoalSummary,
    selectedText: opts.selectedText,
    activeFile: active,
    snapshotLabel: snap?.label,
  };
}

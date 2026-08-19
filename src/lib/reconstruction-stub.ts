import type { VideoReconstruction } from "@/lib/types";

/** Instant client/server stub so Open editor is never blocked on disk or YouTube. */
export function emptyReconstruction(videoId: string): VideoReconstruction {
  return {
    videoId,
    title: "YouTube",
    channel: "YouTube",
    duration: 0,
    language: "plaintext",
    tutorialGoalSummary: "",
    inferredProjectStructure: { files: [], description: "", language: "plaintext" },
    snapshots: [],
    transcript: [],
    source: "partial",
    status: "ready",
    progress: 100,
    message: "Open the editor to read this frame.",
    editorTheme: "chronos-dark",
    processedRanges: [],
    horizonEnd: 0,
  };
}

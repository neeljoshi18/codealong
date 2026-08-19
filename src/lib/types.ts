export type ReconstructionSource = "seed" | "pipeline" | "partial" | "ocr";

export type SnapshotOrigin = "seed" | "ocr" | "transcript-llm" | "cleaned";

export type JobStatus =
  | "idle"
  | "queued"
  | "fetching"
  | "extracting"
  | "reconstructing"
  | "refining"
  | "consolidating"
  | "ready"
  | "error";

export type StudioMode = "watch" | "experiment";

export type Appearance = "dark" | "light";

export type TutorialKind = "evolving" | "episodes";

export type AiMode = "query" | "understand" | "explain-diff" | "explain-tutorial";

export type ExecutionRuntime = "e2b" | "pyodide" | "worker";

export interface CursorPos {
  line: number;
  column: number;
}

export interface CodeSnapshot {
  id: string;
  timestamp: number;
  language: string;
  activeFile: string;
  files: Record<string, string>;
  label: string;
  cursor?: CursorPos;
  origin?: SnapshotOrigin;
}

export interface TranscriptCue {
  start: number;
  duration: number;
  text: string;
}

export interface InferredProjectStructure {
  files: string[];
  description: string;
  entrypoint?: string;
  language: string;
}

export interface VideoReconstruction {
  videoId: string;
  title: string;
  channel: string;
  duration: number;
  language: string;
  tutorialGoalSummary: string;
  inferredProjectStructure: InferredProjectStructure;
  snapshots: CodeSnapshot[];
  transcript: TranscriptCue[];
  source: ReconstructionSource;
  status: JobStatus;
  progress: number;
  message: string;
  error?: string;
  thumbnailUrl?: string;
  editorTheme: "chronos-dark" | "chronos-js" | "chronos-light";
  processedAt?: string;
  processedRanges?: { start: number; end: number }[];
  horizonEnd?: number;
  tutorialKind?: TutorialKind;
}

export interface ProcessingJob {
  videoId: string;
  status: JobStatus;
  progress: number;
  message: string;
  error?: string;
  startedAt: string;
  updatedAt: string;
}

export interface AiContextPack {
  videoId: string;
  currentTimestamp: number;
  transcriptWindow: string;
  originalCodeAtTime: string;
  userCode: string;
  diff: string;
  language: string;
  inferredProjectStructure: InferredProjectStructure;
  tutorialGoalSummary: string;
  selectedText?: string;
  activeFile?: string;
  snapshotLabel?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
}

export interface ExperimentBranch {
  id: string;
  videoId: string;
  name: string;
  createdAt: string;
  sourceTimestamp: number;
  files: Record<string, string>;
  language: string;
  activeFile: string;
  notes?: string;
}

export interface ExecutionResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  runtime: ExecutionRuntime;
  durationMs: number;
  returnValue?: string;
}

export interface FeaturedTutorial {
  videoId: string;
  title: string;
  channel: string;
  durationLabel: string;
  language: string;
  blurb: string;
}

"use client";

import { create } from "zustand";
import { nanoid } from "nanoid";
import { clamp } from "@/lib/utils";
import { findSnapshotIndex, snapshotAt } from "@/lib/snapshots";
import type {
  AiMode,
  ChatMessage,
  CodeSnapshot,
  ExecutionResult,
  ExperimentBranch,
  StudioMode,
  TranscriptCue,
  VideoReconstruction,
} from "@/lib/types";

export const EMPTY_TRANSCRIPT: TranscriptCue[] = [];
export const EMPTY_SNAPSHOTS: CodeSnapshot[] = [];
export const EMPTY_FILES: Record<string, string> = {};

interface StudioState {
  videoId: string | null;
  reconstruction: VideoReconstruction | null;
  videoTime: number;
  codeTime: number;
  followVideo: boolean;
  playerReady: boolean;
  playing: boolean;
  duration: number;
  mode: StudioMode;
  activeFile: string;
  experimentFiles: Record<string, string>;
  experimentActiveFile: string;
  experimentDirty: boolean;
  experimentSourceTime: number;
  stdin: string;
  runResult: ExecutionResult | null;
  running: boolean;
  branches: ExperimentBranch[];
  selectedText: string;
  selectionAnchor: { x: number; y: number } | null;
  aiOpen: boolean;
  aiMode: AiMode;
  aiMessages: ChatMessage[];
  aiBusy: boolean;
  seekRequest: { time: number; token: number } | null;
  playbackRequest: { action: "play" | "pause" | "toggle"; token: number } | null;

  resetSession: (videoId: string) => void;
  hydrate: (videoId: string, rec: VideoReconstruction, branches?: ExperimentBranch[]) => void;
  patchReconstruction: (rec: VideoReconstruction) => void;
  setVideoTime: (t: number) => void;
  setPlaying: (playing: boolean) => void;
  setPlayerReady: (ready: boolean) => void;
  setDuration: (d: number) => void;
  setCodeTime: (t: number, detach?: boolean) => void;
  nudgeCodeTime: (deltaSeconds: number) => void;
  setFollowVideo: (follow: boolean) => void;
  setActiveFile: (file: string) => void;
  setMode: (mode: StudioMode) => void;
  enterExperiment: () => void;
  openWorkbench: (snap?: CodeSnapshot | null) => void;
  exitExperiment: () => void;
  updateExperimentFile: (file: string, value: string) => void;
  setExperimentActiveFile: (file: string) => void;
  setStdin: (value: string) => void;
  setRunResult: (result: ExecutionResult | null) => void;
  setRunning: (running: boolean) => void;
  addBranch: (branch: ExperimentBranch) => void;
  loadBranch: (branch: ExperimentBranch) => void;
  setSelection: (text: string, anchor: { x: number; y: number } | null) => void;
  openAi: (mode: AiMode, seed?: string) => void;
  closeAi: () => void;
  pushMessage: (msg: Omit<ChatMessage, "id" | "createdAt"> & { id?: string }) => void;
  setAiBusy: (busy: boolean) => void;
  requestSeek: (time: number) => void;
  requestPlayback: (action: "play" | "pause" | "toggle") => void;
}

export const useStudio = create<StudioState>((set, get) => ({
  videoId: null,
  reconstruction: null,
  videoTime: 0,
  codeTime: 0,
  followVideo: true,
  playerReady: false,
  playing: false,
  duration: 0,
  mode: "watch",
  activeFile: "",
  experimentFiles: {},
  experimentActiveFile: "",
  experimentDirty: false,
  experimentSourceTime: 0,
  stdin: "",
  runResult: null,
  running: false,
  branches: [],
  selectedText: "",
  selectionAnchor: null,
  aiOpen: false,
  aiMode: "query",
  aiMessages: [],
  aiBusy: false,
  seekRequest: null,
  playbackRequest: null,

  resetSession: (videoId) => {
    if (get().videoId === videoId && get().reconstruction) return;
    set({
      videoId,
      reconstruction: null,
      videoTime: 0,
      codeTime: 0,
      followVideo: true,
      playerReady: false,
      playing: false,
      duration: 0,
      mode: "watch",
      activeFile: "",
      experimentFiles: {},
      experimentActiveFile: "",
      experimentDirty: false,
      experimentSourceTime: 0,
      stdin: "",
      runResult: null,
      running: false,
      branches: [],
      selectedText: "",
      selectionAnchor: null,
      aiOpen: false,
      aiMessages: [],
      aiBusy: false,
    });
  },

  hydrate: (videoId, rec, branches = []) => {
    const switching = get().videoId !== videoId;
    const first = rec.snapshots[0];
    set({
      videoId,
      reconstruction: rec,
      duration: rec.duration || (switching ? 0 : get().duration),
      activeFile:
        !switching && get().activeFile && rec.snapshots.some((s) => s.files[get().activeFile] !== undefined)
          ? get().activeFile
          : (first?.activeFile ?? Object.keys(first?.files ?? {})[0] ?? ""),
      branches,
      ...(switching
        ? {
            videoTime: 0,
            codeTime: 0,
            followVideo: true,
            mode: "watch" as const,
            experimentFiles: {},
            experimentActiveFile: "",
            experimentDirty: false,
            experimentSourceTime: 0,
            stdin: "",
            runResult: null,
            running: false,
            selectedText: "",
            selectionAnchor: null,
            aiOpen: false,
            aiMessages: [],
            aiBusy: false,
          }
        : {}),
    });
  },

  patchReconstruction: (rec) => {
    const current = get();
    const first = rec.snapshots[0];
    set({
      reconstruction: rec,
      duration: rec.duration || current.duration,
      activeFile:
        current.activeFile && rec.snapshots.some((s) => s.files[current.activeFile] !== undefined)
          ? current.activeFile
          : (first?.activeFile ?? ""),
    });
  },

  setVideoTime: (t) => {
    const { followVideo, mode } = get();
    const next: Partial<StudioState> = { videoTime: t };
    if (followVideo && mode === "watch") {
      next.codeTime = t;
      const snap = currentSnapshotFrom(get().reconstruction, t);
      if (snap && get().activeFile && snap.files[get().activeFile] === undefined) {
        next.activeFile = snap.activeFile;
      }
    }
    set(next);
  },

  setPlaying: (playing) => set({ playing }),
  setPlayerReady: (playerReady) => set({ playerReady }),
  setDuration: (d) =>
    set((s) => ({ duration: d > 0 ? d : s.duration })),

  setCodeTime: (t, detach = true) => {
    const max = get().duration || get().reconstruction?.duration || t;
    const codeTime = clamp(t, 0, max);
    const snap = currentSnapshotFrom(get().reconstruction, codeTime);
    set({
      codeTime,
      followVideo: detach ? false : get().followVideo,
      activeFile: snap
        ? snap.files[get().activeFile] !== undefined
          ? get().activeFile
          : snap.activeFile
        : get().activeFile,
    });
  },

  nudgeCodeTime: (deltaSeconds) => {
    const max = get().duration || get().reconstruction?.duration || 0;
    const codeTime = clamp(get().codeTime + deltaSeconds, 0, max);
    if (codeTime === get().codeTime) {
      if (get().followVideo) set({ followVideo: false });
      return;
    }
    const snap = currentSnapshotFrom(get().reconstruction, codeTime);
    set({
      codeTime,
      followVideo: false,
      activeFile: snap
        ? snap.files[get().activeFile] !== undefined
          ? get().activeFile
          : snap.activeFile
        : get().activeFile,
    });
  },

  setFollowVideo: (follow) => {
    if (follow) {
      set({ followVideo: true, codeTime: get().videoTime, mode: "watch" });
    } else {
      set({ followVideo: false });
    }
  },

  setActiveFile: (file) => set({ activeFile: file }),

  setMode: (mode) => set({ mode }),

  enterExperiment: () => {
    const snap = currentSnapshotFrom(get().reconstruction, get().codeTime);
    const files = { ...(snap?.files ?? {}) };
    const active = get().activeFile && files[get().activeFile] !== undefined
      ? get().activeFile
      : (snap?.activeFile ?? Object.keys(files)[0] ?? "");
    set({
      mode: "experiment",
      followVideo: false,
      experimentFiles: files,
      experimentActiveFile: active,
      experimentDirty: false,
      experimentSourceTime: get().codeTime,
      runResult: null,
    });
  },

  openWorkbench: (forced) => {
    const t = get().videoTime;
    const snap = forced ?? currentSnapshotFrom(get().reconstruction, t);
    const files = { ...(snap?.files ?? {}) };
    const active = snap?.activeFile ?? Object.keys(files)[0] ?? "";
    set({
      mode: "experiment",
      followVideo: false,
      codeTime: forced?.timestamp ?? t,
      activeFile: active,
      experimentFiles: files,
      experimentActiveFile: active,
      experimentDirty: false,
      experimentSourceTime: forced?.timestamp ?? t,
      runResult: null,
      selectedText: "",
      selectionAnchor: null,
    });
  },

  exitExperiment: () =>
    set({
      mode: "watch",
      experimentDirty: false,
      runResult: null,
    }),

  updateExperimentFile: (file, value) =>
    set((s) => ({
      experimentFiles: { ...s.experimentFiles, [file]: value },
      experimentDirty: true,
    })),

  setExperimentActiveFile: (file) => set({ experimentActiveFile: file }),
  setStdin: (stdin) => set({ stdin }),
  setRunResult: (runResult) => set({ runResult }),
  setRunning: (running) => set({ running }),
  addBranch: (branch) => set((s) => ({ branches: [branch, ...s.branches] })),
  loadBranch: (branch) =>
    set({
      mode: "experiment",
      followVideo: false,
      experimentFiles: { ...branch.files },
      experimentActiveFile: branch.activeFile,
      experimentDirty: false,
      experimentSourceTime: branch.sourceTimestamp,
      codeTime: branch.sourceTimestamp,
    }),

  setSelection: (selectedText, selectionAnchor) => set({ selectedText, selectionAnchor }),

  openAi: (aiMode, seed) => {
    const messages: ChatMessage[] = seed
      ? [
          {
            id: nanoid(),
            role: "user",
            content: seed,
            createdAt: new Date().toISOString(),
          },
        ]
      : [];
    set({ aiOpen: true, aiMode, aiMessages: messages });
  },

  closeAi: () => set({ aiOpen: false }),

  pushMessage: (msg) =>
    set((s) => ({
      aiMessages: [
        ...s.aiMessages,
        {
          id: msg.id ?? nanoid(),
          role: msg.role,
          content: msg.content,
          createdAt: new Date().toISOString(),
        },
      ],
    })),

  setAiBusy: (aiBusy) => set({ aiBusy }),

  requestSeek: (time) => {
    const follow = get().followVideo && get().mode === "watch";
    set({
      seekRequest: { time, token: Date.now() },
      videoTime: time,
      codeTime: follow ? time : get().codeTime,
    });
  },

  requestPlayback: (action) =>
    set({ playbackRequest: { action, token: Date.now() } }),
}));

function currentSnapshotFrom(
  rec: VideoReconstruction | null,
  time: number,
): CodeSnapshot | null {
  if (!rec) return null;
  return snapshotAt(rec.snapshots, time);
}

export function selectSnapshotIndex(s: {
  reconstruction: VideoReconstruction | null;
  codeTime: number;
}): number {
  return findSnapshotIndex(s.reconstruction?.snapshots ?? EMPTY_SNAPSHOTS, s.codeTime);
}

export function selectCurrentSnapshot(s: {
  reconstruction: VideoReconstruction | null;
  codeTime: number;
}): CodeSnapshot | null {
  return snapshotAt(s.reconstruction?.snapshots ?? EMPTY_SNAPSHOTS, s.codeTime);
}

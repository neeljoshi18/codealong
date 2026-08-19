import { mkdirSync, readFileSync, renameSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { dataRoot } from "@/lib/paths";
import type { ExperimentBranch, ProcessingJob, VideoReconstruction } from "@/lib/types";

const memoryRecs = new Map<string, VideoReconstruction>();
const memoryJobs = new Map<string, ProcessingJob>();
const memoryBranches = new Map<string, ExperimentBranch[]>();

const CACHE = () => join(dataRoot(), "cache");
const JOBS = () => join(dataRoot(), "jobs");
const BRANCHES = () => join(dataRoot(), "branches");

function ensureDir(path: string) {
  mkdirSync(path, { recursive: true });
}

function atomicWrite(path: string, data: unknown) {
  ensureDir(dirname(path));
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(data, null, 2), "utf8");
  renameSync(tmp, path);
}

function readJson<T>(path: string): T | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return null;
  }
}

export function getCachedReconstruction(videoId: string): VideoReconstruction | null {
  return readJson<VideoReconstruction>(join(CACHE(), `${videoId}.json`)) ?? memoryRecs.get(videoId) ?? null;
}

export function saveReconstruction(rec: VideoReconstruction): void {
  rec.processedAt = new Date().toISOString();
  memoryRecs.set(rec.videoId, rec);
  try {
    atomicWrite(join(CACHE(), `${rec.videoId}.json`), rec);
  } catch {
    // Vercel used to 500 here: mkdir '/var/task/data/cache'. Memory still holds it.
  }
}

export function getJob(videoId: string): ProcessingJob | null {
  return readJson<ProcessingJob>(join(JOBS(), `${videoId}.json`)) ?? memoryJobs.get(videoId) ?? null;
}

export function saveJob(job: ProcessingJob): void {
  job.updatedAt = new Date().toISOString();
  memoryJobs.set(job.videoId, job);
  try {
    atomicWrite(join(JOBS(), `${job.videoId}.json`), job);
  } catch {
    /* same as saveReconstruction */
  }
}

export function upsertJob(
  videoId: string,
  patch: Partial<ProcessingJob>,
): ProcessingJob {
  const now = new Date().toISOString();
  const prev = getJob(videoId);
  const next: ProcessingJob = {
    videoId,
    status: "queued",
    progress: 0,
    message: "",
    startedAt: prev?.startedAt ?? now,
    updatedAt: now,
    ...prev,
    ...patch,
  };
  saveJob(next);
  return next;
}

export function listBranches(videoId: string): ExperimentBranch[] {
  return (
    readJson<ExperimentBranch[]>(join(BRANCHES(), `${videoId}.json`)) ??
    memoryBranches.get(videoId) ??
    []
  );
}

export function saveBranch(branch: ExperimentBranch): ExperimentBranch[] {
  const all = listBranches(branch.videoId);
  const next = [branch, ...all.filter((b) => b.id !== branch.id)];
  memoryBranches.set(branch.videoId, next);
  try {
    atomicWrite(join(BRANCHES(), `${branch.videoId}.json`), next);
  } catch {
    /* ignore */
  }
  return next;
}

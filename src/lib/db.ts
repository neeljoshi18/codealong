import { mkdirSync, readFileSync, renameSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import type { ExperimentBranch, ProcessingJob, VideoReconstruction } from "@/lib/types";

const ROOT = join(process.cwd(), "data");
const CACHE = join(ROOT, "cache");
const JOBS = join(ROOT, "jobs");
const BRANCHES = join(ROOT, "branches");

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
  return readJson<VideoReconstruction>(join(CACHE, `${videoId}.json`));
}

export function saveReconstruction(rec: VideoReconstruction): void {
  rec.processedAt = new Date().toISOString();
  atomicWrite(join(CACHE, `${rec.videoId}.json`), rec);
}

export function getJob(videoId: string): ProcessingJob | null {
  return readJson<ProcessingJob>(join(JOBS, `${videoId}.json`));
}

export function saveJob(job: ProcessingJob): void {
  job.updatedAt = new Date().toISOString();
  atomicWrite(join(JOBS, `${job.videoId}.json`), job);
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
  return readJson<ExperimentBranch[]>(join(BRANCHES, `${videoId}.json`)) ?? [];
}

export function saveBranch(branch: ExperimentBranch): ExperimentBranch[] {
  const all = listBranches(branch.videoId);
  const next = [branch, ...all.filter((b) => b.id !== branch.id)];
  atomicWrite(join(BRANCHES, `${branch.videoId}.json`), next);
  return next;
}

import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** Vercel/Lambda only allow writes under /tmp. Local and the droplet use ./data. */
export function isEphemeralHost(): boolean {
  return Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

export function dataRoot(): string {
  if (process.env.DATA_DIR) return process.env.DATA_DIR;
  if (isEphemeralHost()) return join(tmpdir(), "codealong-data");
  return join(process.cwd(), "data");
}

export function firstExisting(paths: Array<string | undefined | null>): string | null {
  for (const p of paths) {
    if (p && existsSync(p)) return p;
  }
  return null;
}

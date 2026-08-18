import type { ExecutionResult } from "@/lib/types";
import { sandboxFamily } from "@/lib/sandbox/languages";

export function hasE2B(): boolean {
  return Boolean(process.env.E2B_API_KEY);
}

export async function runInE2B(opts: {
  language: string;
  files: Record<string, string>;
  entrypoint: string;
  stdin: string;
}): Promise<ExecutionResult> {
  if (!hasE2B()) {
    throw new Error("E2B_API_KEY is not configured");
  }

  const started = Date.now();
  const family = sandboxFamily(opts.language, opts.files);
  const { Sandbox } = await import("@e2b/code-interpreter");
  const sandbox = await Sandbox.create({ apiKey: process.env.E2B_API_KEY });

  try {
    for (const [name, content] of Object.entries(opts.files)) {
      await sandbox.files.write(name, content);
    }

    const stdin = opts.stdin ?? "";
    let code: string;
    if (family === "python") {
      const inputs = JSON.stringify(stdin.split(/\r?\n/));
      code = `
import builtins, sys
from pathlib import Path
_inputs = list(${inputs})
def _input(prompt=""):
    print(prompt, end="")
    return _inputs.pop(0) if _inputs else ""
builtins.input = _input
sys.argv = [${JSON.stringify(opts.entrypoint)}]
code = Path(${JSON.stringify(opts.entrypoint)}).read_text()
exec(compile(code, ${JSON.stringify(opts.entrypoint)}, "exec"), {"__name__": "__main__"})
`;
    } else {
      code = `
const fs = require('fs');
const inputs = ${JSON.stringify(stdin.split(/\r?\n/))};
const orig = global.prompt;
global.prompt = (q) => { if (q) process.stdout.write(String(q)); return inputs.shift() ?? ''; };
require('module')._load(${JSON.stringify("./" + opts.entrypoint)}, null, true);
global.prompt = orig;
`;
    }

    const execution = await sandbox.runCode(code);
    const stdout = (execution.logs?.stdout ?? []).join("\n");
    const stderr = (execution.logs?.stderr ?? []).join("\n");
    const errText = execution.error
      ? `${execution.error.name}: ${execution.error.value}\n${execution.error.traceback ?? ""}`
      : "";

    return {
      ok: !execution.error,
      stdout,
      stderr: [stderr, errText].filter(Boolean).join("\n"),
      exitCode: execution.error ? 1 : 0,
      runtime: "e2b",
      durationMs: Date.now() - started,
      returnValue: execution.results?.[0]?.text,
    };
  } finally {
    await sandbox.kill().catch(() => undefined);
  }
}

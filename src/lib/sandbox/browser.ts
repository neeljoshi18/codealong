"use client";

import type { ExecutionResult } from "@/lib/types";
import { sandboxFamily } from "@/lib/sandbox/languages";

export async function runInBrowser(opts: {
  language: string;
  files: Record<string, string>;
  entrypoint: string;
  stdin: string;
}): Promise<ExecutionResult> {
  const family = sandboxFamily(opts.language, opts.files);
  if (family === "python") return runPython(opts);
  if (family === "javascript") return runJavascript(opts);
  return {
    ok: false,
    stdout: "",
    stderr: `No in-browser runner for ${opts.language}. Configure E2B_API_KEY for multi-language sandboxes.`,
    exitCode: 1,
    runtime: "worker",
    durationMs: 0,
  };
}

function runJavascript(opts: {
  files: Record<string, string>;
  entrypoint: string;
  stdin: string;
}): Promise<ExecutionResult> {
  const started = Date.now();
  const source = buildJsWorkerSource();
  const worker = new Worker(URL.createObjectURL(new Blob([source], { type: "text/javascript" })));

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      worker.terminate();
      resolve({
        ok: false,
        stdout: "",
        stderr: "Timed out after 8s",
        exitCode: 124,
        runtime: "worker",
        durationMs: Date.now() - started,
      });
    }, 8000);

    worker.onmessage = (ev: MessageEvent<ExecutionResult>) => {
      clearTimeout(timer);
      worker.terminate();
      resolve({ ...ev.data, durationMs: Date.now() - started, runtime: "worker" });
    };
    worker.onerror = (err) => {
      clearTimeout(timer);
      worker.terminate();
      resolve({
        ok: false,
        stdout: "",
        stderr: err.message || "Worker error",
        exitCode: 1,
        runtime: "worker",
        durationMs: Date.now() - started,
      });
    };
    worker.postMessage({
      files: opts.files,
      entrypoint: opts.entrypoint,
      stdin: opts.stdin,
    });
  });
}

function buildJsWorkerSource(): string {
  return `
self.onmessage = (e) => {
  const { files, entrypoint, stdin } = e.data;
  const logs = [];
  const errs = [];
  const inputs = String(stdin || '').split(/\\r?\\n/);
  const fakeConsole = {
    log: (...a) => logs.push(a.map(stringify).join(' ')),
    info: (...a) => logs.push(a.map(stringify).join(' ')),
    warn: (...a) => logs.push(a.map(stringify).join(' ')),
    error: (...a) => errs.push(a.map(stringify).join(' ')),
  };
  function stringify(v) {
    if (typeof v === 'string') return v;
    try { return JSON.stringify(v); } catch { return String(v); }
  }
  const modules = Object.create(null);
  function compile(name, src) {
    const stripped = String(src).replace(/^import\\s+.+?;$/gm, '').replace(/export\\s+default\\s+/g, 'module.exports = ').replace(/export\\s+\\{/g, 'module.exports = {');
    const fn = new Function('exports', 'module', 'require', 'console', 'prompt', stripped);
    return fn;
  }
  function req(spec) {
    let name = spec;
    if (name.startsWith('./')) name = name.slice(2);
    if (!files[name]) {
      const guess = Object.keys(files).find((k) => k === name || k.startsWith(name + '.') || k.endsWith('/' + name));
      if (guess) name = guess;
    }
    if (!files[name]) throw new Error('Cannot find module ' + spec);
    if (modules[name]) return modules[name].exports;
    const module = { exports: {} };
    modules[name] = module;
    const fn = compile(name, files[name]);
    fn(module.exports, module, req, fakeConsole, (q) => { if (q) fakeConsole.log(q); return inputs.shift() ?? ''; });
    return module.exports;
  }
  try {
    const result = req(entrypoint);
    self.postMessage({ ok: true, stdout: logs.join('\\n'), stderr: errs.join('\\n'), exitCode: 0, returnValue: result === undefined ? undefined : stringify(result) });
  } catch (err) {
    self.postMessage({ ok: false, stdout: logs.join('\\n'), stderr: String(err && err.stack || err), exitCode: 1 });
  }
};
`;
}

let pyodideReady: Promise<PyodideLike> | null = null;

interface PyodideLike {
  FS: { writeFile: (path: string, data: string) => void };
  setStdout: (opts: { batched: (s: string) => void }) => void;
  setStderr: (opts: { batched: (s: string) => void }) => void;
  runPythonAsync: (code: string) => Promise<unknown>;
}

async function loadPyodide(): Promise<PyodideLike> {
  if (pyodideReady) return pyodideReady;
  pyodideReady = (async () => {
    const w = window as unknown as { loadPyodide?: (o: { indexURL: string }) => Promise<PyodideLike> };
    if (!w.loadPyodide) {
      await new Promise<void>((resolve, reject) => {
        const s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js";
        s.onload = () => resolve();
        s.onerror = () => reject(new Error("Failed to load Pyodide"));
        document.head.appendChild(s);
      });
    }
    const loader = (window as unknown as { loadPyodide: (o: { indexURL: string }) => Promise<PyodideLike> })
      .loadPyodide;
    return loader({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/" });
  })();
  return pyodideReady;
}

async function runPython(opts: {
  files: Record<string, string>;
  entrypoint: string;
  stdin: string;
}): Promise<ExecutionResult> {
  const started = Date.now();
  try {
    const py = await loadPyodide();
    const stdout: string[] = [];
    const stderr: string[] = [];
    py.setStdout({ batched: (s) => stdout.push(s) });
    py.setStderr({ batched: (s) => stderr.push(s) });
    for (const [name, content] of Object.entries(opts.files)) {
      py.FS.writeFile(name, content);
    }
    const runner = `
import builtins, sys, traceback
_inputs = ${JSON.stringify(opts.stdin.split(/\r?\n/))}
def _input(prompt=""):
    if prompt:
        print(prompt, end="")
    return _inputs.pop(0) if _inputs else ""
builtins.input = _input
sys.argv = [${JSON.stringify(opts.entrypoint)}]
try:
    with open(${JSON.stringify(opts.entrypoint)}) as f:
        src = f.read()
    exec(compile(src, ${JSON.stringify(opts.entrypoint)}, "exec"), {"__name__": "__main__"})
except SystemExit:
    pass
except Exception:
    traceback.print_exc()
    raise
`;
    try {
      await py.runPythonAsync(runner);
      return {
        ok: true,
        stdout: stdout.join(""),
        stderr: stderr.join(""),
        exitCode: 0,
        runtime: "pyodide",
        durationMs: Date.now() - started,
      };
    } catch (err) {
      return {
        ok: false,
        stdout: stdout.join(""),
        stderr: stderr.join("") || String(err),
        exitCode: 1,
        runtime: "pyodide",
        durationMs: Date.now() - started,
      };
    }
  } catch (err) {
    return {
      ok: false,
      stdout: "",
      stderr: err instanceof Error ? err.message : String(err),
      exitCode: 1,
      runtime: "pyodide",
      durationMs: Date.now() - started,
    };
  }
}

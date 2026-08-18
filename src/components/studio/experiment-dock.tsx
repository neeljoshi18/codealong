"use client";

import { useEffect, useState } from "react";
import { FlaskConical, Play, Save, Sparkles, Undo2 } from "lucide-react";
import { nanoid } from "nanoid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { packContext } from "@/lib/context-pack";
import { guessEntrypoint } from "@/lib/utils";
import { runInBrowser } from "@/lib/sandbox/browser";
import { formatTime } from "@/lib/utils";
import { useStudio } from "@/lib/store";
import type { ExecutionResult, ExperimentBranch } from "@/lib/types";

export function ExperimentDock() {
  const mode = useStudio((s) => s.mode);
  const reconstruction = useStudio((s) => s.reconstruction);
  const experimentFiles = useStudio((s) => s.experimentFiles);
  const experimentActiveFile = useStudio((s) => s.experimentActiveFile);
  const experimentSourceTime = useStudio((s) => s.experimentSourceTime);
  const stdin = useStudio((s) => s.stdin);
  const setStdin = useStudio((s) => s.setStdin);
  const runResult = useStudio((s) => s.runResult);
  const running = useStudio((s) => s.running);
  const setRunning = useStudio((s) => s.setRunning);
  const setRunResult = useStudio((s) => s.setRunResult);
  const exitExperiment = useStudio((s) => s.exitExperiment);
  const addBranch = useStudio((s) => s.addBranch);
  const branches = useStudio((s) => s.branches);
  const loadBranch = useStudio((s) => s.loadBranch);
  const openAi = useStudio((s) => s.openAi);
  const videoId = useStudio((s) => s.videoId);
  const [branchName, setBranchName] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key !== "Enter") return;
      if (useStudio.getState().mode !== "experiment") return;
      e.preventDefault();
      document.getElementById("chronos-run")?.click();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (mode !== "experiment" || !reconstruction) return null;

  const run = async () => {
    const entry = guessEntrypoint(experimentFiles, reconstruction.language);
    setRunning(true);
    setRunResult(null);
    try {
      const remote = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language: reconstruction.language,
          files: experimentFiles,
          entrypoint: entry,
          stdin,
        }),
      });
      const data = (await remote.json()) as ExecutionResult & { fallback?: string };
      if (data.fallback === "browser" || data.runtime === undefined) {
        const local = await runInBrowser({
          language: reconstruction.language,
          files: experimentFiles,
          entrypoint: entry,
          stdin,
        });
        setRunResult(local);
      } else {
        setRunResult(data);
      }
    } catch (err) {
      const local = await runInBrowser({
        language: reconstruction.language,
        files: experimentFiles,
        entrypoint: entry,
        stdin,
      });
      if (!local.ok && err instanceof Error) {
        setRunResult({ ...local, stderr: `${local.stderr}\n${err.message}` });
      } else {
        setRunResult(local);
      }
    } finally {
      setRunning(false);
    }
  };

  const save = async () => {
    if (!videoId) return;
    const branch: ExperimentBranch = {
      id: nanoid(8),
      videoId,
      name: branchName.trim() || `Branch @ ${formatTime(experimentSourceTime)}`,
      createdAt: new Date().toISOString(),
      sourceTimestamp: experimentSourceTime,
      files: { ...experimentFiles },
      language: reconstruction.language,
      activeFile: experimentActiveFile,
    };
    addBranch(branch);
    setBranchName("");
    await fetch("/api/branches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(branch),
    });
  };

  const explain = (kind: "difference" | "tutorial") => {
    openAi(kind === "difference" ? "explain-diff" : "explain-tutorial");
    void (async () => {
      useStudio.getState().setAiBusy(true);
      try {
        const ctx = packContext({
          reconstruction,
          timestamp: experimentSourceTime,
          userFiles: experimentFiles,
          activeFile: experimentActiveFile,
          selectedText: useStudio.getState().selectedText || undefined,
        });
        const res = await fetch("/api/ai/explain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            context: ctx,
            kind,
            runOutput: runResult
              ? `ok=${runResult.ok}\nstdout:\n${runResult.stdout}\nstderr:\n${runResult.stderr}`
              : undefined,
          }),
        });
        const data = (await res.json()) as { text?: string };
        useStudio.getState().pushMessage({
          role: "assistant",
          content: data.text ?? "No explanation returned.",
        });
      } finally {
        useStudio.getState().setAiBusy(false);
      }
    })();
  };

  return (
    <div className="flex h-full min-h-0 flex-col border-t border-white/8 bg-[#0b0d11]">
      <div className="flex items-center gap-2 border-b border-white/6 px-3 py-1.5">
        <FlaskConical className="size-3.5 text-sage" />
        <span className="text-[11px] uppercase tracking-[0.14em] text-mute">
          Experiment
        </span>
        <span className="text-[11px] text-mute">
          cloned from {formatTime(experimentSourceTime)}
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <Button id="chronos-run" size="sm" onClick={() => void run()} disabled={running}>
            <Play className="size-3.5" />
            {running ? "Running…" : "Run"}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => explain("difference")}>
            <Sparkles className="size-3.5" />
            Explain vs original
          </Button>
          <Button size="sm" variant="secondary" onClick={() => explain("tutorial")}>
            Explain vs tutorial
          </Button>
          <Button size="sm" variant="ghost" onClick={exitExperiment}>
            <Undo2 className="size-3.5" />
            Back to watch
          </Button>
        </div>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-[1fr_220px]">
        <div className="min-h-0 overflow-auto px-3 py-2 font-mono text-[12px] leading-5">
          <div className="mb-1 text-[10px] uppercase tracking-wider text-mute">
            {runResult
              ? `${runResult.runtime} · ${runResult.durationMs}ms · exit ${runResult.exitCode}`
              : "stdout / stderr"}
          </div>
          {runResult?.stdout ? (
            <pre className="whitespace-pre-wrap text-sage">{runResult.stdout}</pre>
          ) : null}
          {runResult?.stderr ? (
            <pre className="whitespace-pre-wrap text-rose">{runResult.stderr}</pre>
          ) : null}
          {runResult?.returnValue ? (
            <pre className="whitespace-pre-wrap text-sky">→ {runResult.returnValue}</pre>
          ) : null}
          {!runResult && (
            <p className="text-mute">
              Edit freely, then Run. Python uses Pyodide in the browser; JavaScript runs in a
              worker. Set E2B_API_KEY for a remote sandbox.
            </p>
          )}
        </div>
        <div className="flex min-h-0 flex-col gap-2 border-l border-white/6 p-2">
          <label className="text-[10px] uppercase tracking-wider text-mute">stdin lines</label>
          <textarea
            value={stdin}
            onChange={(e) => setStdin(e.target.value)}
            className="h-16 resize-none rounded-md border border-white/10 bg-black/40 p-2 font-mono text-[11px] text-paper outline-none focus:border-brass/40"
            placeholder="Each line is one input() / prompt()"
          />
          <div className="flex gap-1">
            <Input
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              placeholder="Branch name"
              className="h-7 text-xs"
            />
            <Button size="sm" variant="secondary" onClick={() => void save()}>
              <Save className="size-3.5" />
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            {branches.length === 0 ? (
              <p className="text-[11px] text-mute">No saved branches yet.</p>
            ) : (
              branches.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => loadBranch(b)}
                  className="mb-1 block w-full truncate rounded px-1.5 py-1 text-left text-[11px] text-paper hover:bg-white/6"
                >
                  {b.name}
                  <span className="ml-1 text-mute">{formatTime(b.sourceTimestamp)}</span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

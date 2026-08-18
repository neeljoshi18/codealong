"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { packContext } from "@/lib/context-pack";
import { useStudio } from "@/lib/store";

export function AiDrawer({ float = false }: { float?: boolean }) {
  const open = useStudio((s) => s.aiOpen);
  const mode = useStudio((s) => s.aiMode);
  const messages = useStudio((s) => s.aiMessages);
  const busy = useStudio((s) => s.aiBusy);
  const closeAi = useStudio((s) => s.closeAi);
  const pushMessage = useStudio((s) => s.pushMessage);
  const setAiBusy = useStudio((s) => s.setAiBusy);
  const reconstruction = useStudio((s) => s.reconstruction);
  const codeTime = useStudio((s) => s.codeTime);
  const studioMode = useStudio((s) => s.mode);
  const experimentFiles = useStudio((s) => s.experimentFiles);
  const selectedText = useStudio((s) => s.selectedText);
  const activeFile = useStudio((s) =>
    s.mode === "experiment" ? s.experimentActiveFile : s.activeFile,
  );
  const [draft, setDraft] = useState("");
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [messages, busy]);

  useEffect(() => {
    if (!open || !reconstruction) return;
    const hasAssistant = messages.some((m) => m.role === "assistant");
    if (hasAssistant || busy) return;
    if (mode === "understand") {
      void runUnderstand();
      return;
    }
    const first = messages[0];
    if (mode === "query" && first?.role === "user") {
      void askModel(first.content, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode]);

  if (!open) return null;

  const title =
    mode === "understand"
      ? "Understand in context"
      : mode === "explain-diff"
        ? "Explain vs original"
        : mode === "explain-tutorial"
          ? "Explain vs tutorial"
          : "Query this";

  async function context() {
    const rec = useStudio.getState().reconstruction;
    if (!rec) throw new Error("No reconstruction");
    return packContext({
      reconstruction: rec,
      timestamp: useStudio.getState().codeTime,
      userFiles: useStudio.getState().mode === "experiment" ? useStudio.getState().experimentFiles : undefined,
      selectedText: useStudio.getState().selectedText || undefined,
      activeFile: useStudio.getState().mode === "experiment"
        ? useStudio.getState().experimentActiveFile
        : useStudio.getState().activeFile,
    });
  }

  async function runUnderstand() {
    setAiBusy(true);
    try {
      const res = await fetch("/api/ai/understand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context: await context() }),
      });
      const data = (await res.json()) as { text?: string; error?: string };
      pushMessage({ role: "assistant", content: data.text ?? data.error ?? "No response" });
    } finally {
      setAiBusy(false);
    }
  }

  async function askModel(question: string, alreadyPushed = false) {
    const q = question.trim();
    if (!q) return;
    if (!alreadyPushed) pushMessage({ role: "user", content: q });
    setDraft("");
    setAiBusy(true);
    try {
      const history = useStudio
        .getState()
        .aiMessages.filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
      const res = await fetch("/api/ai/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context: await context(), question: q, history }),
      });
      const data = (await res.json()) as { text?: string; error?: string };
      pushMessage({ role: "assistant", content: data.text ?? data.error ?? "No response" });
    } finally {
      setAiBusy(false);
    }
  }

  async function send(question: string) {
    await askModel(question, false);
  }

  return (
    <aside
      className={
        float
          ? "absolute right-0 top-0 z-40 flex h-full w-[380px] flex-col border-l border-white/8 bg-[#10131a] shadow-2xl"
          : "flex h-full w-[380px] shrink-0 flex-col border-l border-white/8 bg-[#10131a]"
      }
    >
      <header className="flex items-center justify-between border-b border-white/6 px-3 py-2">
        <div>
          <div className="text-sm text-paper">{title}</div>
          <div className="text-[11px] text-mute">
            Grounded at {reconstruction ? "" : ""}
            {useStudio.getState().codeTime.toFixed(1)}s
            {selectedText ? " · selection packed" : ""}
          </div>
        </div>
        <Button size="icon" variant="ghost" onClick={closeAi} aria-label="Close">
          <X />
        </Button>
      </header>
      <div ref={scroller} className="min-h-0 flex-1 space-y-3 overflow-auto px-3 py-3">
        {messages.map((m) => (
          <div
            key={m.id}
            className={
              m.role === "user"
                ? "ml-6 rounded-lg bg-brass/15 px-3 py-2 text-[13px] text-paper"
                : "mr-2 whitespace-pre-wrap rounded-lg bg-white/4 px-3 py-2 text-[13px] leading-6 text-paper"
            }
          >
            {m.content}
          </div>
        ))}
        {busy && <div className="text-[12px] text-mute">Thinking with packed context…</div>}
      </div>
      <form
        className="border-t border-white/6 p-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send(draft);
        }}
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(draft);
            }
          }}
          rows={3}
          className="w-full resize-none rounded-md border border-white/10 bg-black/30 p-2 text-sm text-paper outline-none focus:border-brass/40"
          placeholder="Ask about this moment, this selection, or your experiment…"
        />
        <div className="mt-1 flex justify-between text-[11px] text-mute">
          <span>
            {codeTime.toFixed(0)}s
            {studioMode === "experiment" ? ` · ${activeFile}` : ""}
            {Object.keys(experimentFiles).length ? ` · ${Object.keys(experimentFiles).length} files` : ""}
          </span>
          <Button type="submit" size="sm" disabled={busy}>
            Send
          </Button>
        </div>
      </form>
    </aside>
  );
}

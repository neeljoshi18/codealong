"use client";

import { useEffect } from "react";
import { Copy, FlaskConical, HelpCircle, MessageSquare } from "lucide-react";
import { useStudio } from "@/lib/store";

export function SelectionToolbar() {
  const selectedText = useStudio((s) => s.selectedText);
  const anchor = useStudio((s) => s.selectionAnchor);
  const setSelection = useStudio((s) => s.setSelection);
  const openAi = useStudio((s) => s.openAi);
  const enterExperiment = useStudio((s) => s.enterExperiment);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelection("", null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setSelection]);

  if (!selectedText || !anchor) return null;

  const left = Math.min(window.innerWidth - 420, Math.max(12, anchor.x));
  const top = Math.max(12, anchor.y - 48);

  return (
    <div
      className="fixed z-50 flex items-center gap-0.5 rounded-lg border border-white/10 bg-[#161920]/95 p-1 shadow-xl shadow-black/50 backdrop-blur"
      style={{ left, top }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <button
        type="button"
        className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-paper hover:bg-white/8"
        onClick={() => void navigator.clipboard.writeText(selectedText)}
      >
        <Copy className="size-3.5 text-mute" />
        Copy
      </button>
      <button
        type="button"
        className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-paper hover:bg-white/8"
        onClick={() =>
          openAi("query", `Explain this selection:\n\n\`\`\`\n${selectedText}\n\`\`\``)
        }
      >
        <MessageSquare className="size-3.5 text-brass" />
        Query this
      </button>
      <button
        type="button"
        className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-paper hover:bg-white/8"
        onClick={() => openAi("understand")}
      >
        <HelpCircle className="size-3.5 text-sky" />
        Understand in context
      </button>
      <button
        type="button"
        className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-paper hover:bg-white/8"
        onClick={() => {
          enterExperiment();
          setSelection("", null);
        }}
      >
        <FlaskConical className="size-3.5 text-sage" />
        Experiment
      </button>
    </div>
  );
}

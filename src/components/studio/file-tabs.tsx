"use client";

import { EMPTY_FILES, selectCurrentSnapshot, useStudio } from "@/lib/store";
import { cn } from "@/lib/utils";

export function FileTabs() {
  const mode = useStudio((s) => s.mode);
  const fileMap = useStudio((s) => {
    if (s.mode === "experiment") return s.experimentFiles;
    return selectCurrentSnapshot(s)?.files ?? EMPTY_FILES;
  });
  const files = Object.keys(fileMap);
  const active = useStudio((s) =>
    s.mode === "experiment" ? s.experimentActiveFile : s.activeFile,
  );
  const setActiveFile = useStudio((s) => s.setActiveFile);
  const setExperimentActiveFile = useStudio((s) => s.setExperimentActiveFile);

  if (files.length === 0) return null;

  return (
    <div className="flex min-w-0 flex-1 items-end gap-px overflow-x-auto">
      {files.map((file) => {
        const on = file === active;
        return (
          <button
            key={file}
            type="button"
            onClick={() =>
              mode === "experiment" ? setExperimentActiveFile(file) : setActiveFile(file)
            }
            className={cn(
              "max-w-[180px] truncate border-r border-white/6 px-3 py-1.5 text-[12px]",
              on
                ? "bg-[#0e1116] text-paper"
                : "bg-[#0a0c10] text-mute hover:text-paper",
            )}
          >
            {file}
          </button>
        );
      })}
    </div>
  );
}

"use client";

import { Group, Panel, Separator } from "react-resizable-panels";
import { FileTabs } from "@/components/studio/file-tabs";
import { MonacoStage } from "@/components/studio/monaco-stage";
import { ExperimentDock } from "@/components/studio/experiment-dock";
import { EMPTY_SNAPSHOTS, selectCurrentSnapshot, useStudio } from "@/lib/store";
import { formatTime } from "@/lib/utils";

export function CodePane({
  onClose,
  onMinimize,
  onMaximize,
}: {
  onClose?: () => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
}) {
  const mode = useStudio((s) => s.mode);
  const rec = useStudio((s) => s.reconstruction);
  const snap = useStudio((s) => selectCurrentSnapshot(s));
  const codeTime = useStudio((s) => s.codeTime);
  const follow = useStudio((s) => s.followVideo);
  const dirty = useStudio((s) => s.experimentDirty);
  const snapshots = rec?.snapshots ?? EMPTY_SNAPSHOTS;

  return (
    <div className="flex h-full min-h-0 flex-col bg-pane">
      <div className="flex h-9 items-center gap-2 border-b border-line bg-bar px-2">
        <div className="flex items-center gap-1.5 px-1">
          <button
            type="button"
            aria-label="Close editor"
            title="Close editor"
            onClick={onClose}
            className="size-3 rounded-full bg-[#ff5f57] hover:brightness-110"
          />
          <button
            type="button"
            aria-label="Minimize editor"
            title="Minimize editor"
            onClick={onMinimize}
            className="size-3 rounded-full bg-[#febc2e] hover:brightness-110"
          />
          <button
            type="button"
            aria-label="Expand editor"
            title="Expand editor"
            onClick={onMaximize}
            className="size-3 rounded-full bg-[#28c840] hover:brightness-110"
          />
        </div>
        <FileTabs />
        <div className="px-2 font-mono text-[10px] text-mute">
          {snap?.language ?? rec?.language ?? "—"}
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {mode === "experiment" ? (
          <Group orientation="vertical">
            <Panel defaultSize="68%" minSize="40%">
              <div className="flex h-full min-h-0">
                <div className="min-w-0 flex-1">
                  {snapshots.length === 0 ? <EmptyEditor recReady={rec?.status} /> : <MonacoStage />}
                </div>
              </div>
            </Panel>
            <Separator className="h-1.5 bg-line hover:bg-sky/50" />
            <Panel defaultSize="32%" minSize="18%">
              <ExperimentDock />
            </Panel>
          </Group>
        ) : (
          <div className="flex h-full min-h-0">
            <div className="min-w-0 flex-1">
              {snapshots.length === 0 ? <EmptyEditor recReady={rec?.status} /> : <MonacoStage />}
            </div>
          </div>
        )}
      </div>

      <footer className="flex h-6 items-center justify-between border-t border-line bg-bar px-3 font-mono text-[10px] text-mute">
        <span>
          {dirty
            ? "you edited · follow paused"
            : follow
              ? "follows video"
              : snap?.origin === "ocr" || snap?.origin === "cleaned"
                ? "from the screen"
                : snap?.origin === "seed"
                  ? "estimate — not a screen grab"
                  : "detached"}
          {mode === "experiment" ? " · editable" : ""}
        </span>
        <span>
          {snap ? `${snap.label} · ${formatTime(codeTime)} · ${snapshots.length} snapshots` : rec?.message}
        </span>
      </footer>
    </div>
  );
}

function EmptyEditor({ recReady }: { recReady?: string }) {
  return (
    <div className="flex h-full min-h-0 flex-col items-center justify-center gap-2 px-8 text-center">
      <div className="text-sm text-paper">Reconstructing the editor…</div>
      <p className="max-w-sm text-[12px] leading-5 text-mute">
        The video is already playing. Snapshots unlock here as the pipeline stitches code from the
        transcript{recReady === "queued" ? " (starting now)" : ""}. Featured demos load instantly.
      </p>
    </div>
  );
}

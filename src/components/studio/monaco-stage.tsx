"use client";

import { useCallback, useEffect, useRef } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import type { editor as MonacoNS, IDisposable } from "monaco-editor";
import { applyModelText } from "@/lib/monaco-apply";
import { filesFingerprint, languageFromPath } from "@/lib/utils";
import { selectCurrentSnapshot, useStudio } from "@/lib/store";

type Monaco = typeof import("monaco-editor");

function defineThemes(monaco: Monaco) {
  monaco.editor.defineTheme("chronos-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "6b7280", fontStyle: "italic" },
      { token: "string", foreground: "d4a054" },
      { token: "keyword", foreground: "7eb8c9" },
      { token: "number", foreground: "e06c75" },
      { token: "type", foreground: "c3b1e1" },
    ],
    colors: {
      "editor.background": "#0e1116",
      "editor.foreground": "#e8eaed",
      "editorLineNumber.foreground": "#4b5160",
      "editorLineNumber.activeForeground": "#9aa1ad",
      "editor.selectionBackground": "#d4a05440",
      "editor.inactiveSelectionBackground": "#d4a05422",
      "editor.lineHighlightBackground": "#ffffff08",
      "editorCursor.foreground": "#d4a054",
      "editorGutter.background": "#0e1116",
      "scrollbarSlider.background": "#ffffff14",
    },
  });
  monaco.editor.defineTheme("chronos-js", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "5c6370", fontStyle: "italic" },
      { token: "string", foreground: "98c379" },
      { token: "keyword", foreground: "c678dd" },
      { token: "number", foreground: "d19a66" },
    ],
    colors: {
      "editor.background": "#0d1117",
      "editor.foreground": "#e6edf3",
      "editorLineNumber.foreground": "#484f58",
      "editor.selectionBackground": "#388bfd44",
      "editor.lineHighlightBackground": "#161b22",
      "editorCursor.foreground": "#7eb8c9",
      "editorGutter.background": "#0d1117",
    },
  });
  monaco.editor.defineTheme("chronos-light", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "comment", foreground: "6b7280", fontStyle: "italic" },
      { token: "string", foreground: "0f766e" },
      { token: "keyword", foreground: "7c3aed" },
      { token: "number", foreground: "b45309" },
    ],
    colors: {
      "editor.background": "#ffffff",
      "editor.foreground": "#1a1d23",
      "editorLineNumber.foreground": "#9aa1ad",
      "editorLineNumber.activeForeground": "#4b5160",
      "editor.selectionBackground": "#93c5fd88",
      "editor.lineHighlightBackground": "#f3f4f6",
      "editorCursor.foreground": "#1d4ed8",
      "editorGutter.background": "#ffffff",
    },
  });
}

export function MonacoStage({
  historyWheel = false,
  compact = false,
}: {
  historyWheel?: boolean;
  compact?: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<MonacoNS.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const modelsRef = useRef<Map<string, MonacoNS.ITextModel>>(new Map());
  const applyingRef = useRef(false);
  const applyGen = useRef(0);
  const applySignal = useRef({ cancelled: false });
  const pendingDelta = useRef(0);
  const rafRef = useRef(0);

  const mode = useStudio((s) => s.mode);
  const theme = useStudio((s) =>
    s.appearance === "light" ? "chronos-light" : (s.reconstruction?.editorTheme ?? "chronos-dark"),
  );
  const duration = useStudio((s) => s.duration || s.reconstruction?.duration || 0);
  const nudgeCodeTime = useStudio((s) => s.nudgeCodeTime);
  const updateExperimentFile = useStudio((s) => s.updateExperimentFile);
  const setSelection = useStudio((s) => s.setSelection);

  const visibleKey = useStudio((s) => {
    if (s.mode === "experiment") {
      return `exp:${s.experimentActiveFile}:${filesFingerprint(s.experimentFiles)}`;
    }
    const snap = selectCurrentSnapshot(s);
    return snap ? `${snap.id}::${s.activeFile}::${filesFingerprint(snap.files)}` : "none";
  });

  const applyVisible = useCallback(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;
    const state = useStudio.getState();
    const files =
      state.mode === "experiment"
        ? state.experimentFiles
        : (selectCurrentSnapshot(state)?.files ?? {});
    const active =
      state.mode === "experiment" ? state.experimentActiveFile : state.activeFile;

    applySignal.current.cancelled = true;
    applySignal.current = { cancelled: false };
    const signal = applySignal.current;
    applyingRef.current = true;
    applyGen.current += 1;
    const live = state.mode === "experiment" && state.followVideo && !state.experimentDirty;

    for (const [path, value] of Object.entries(files)) {
      const uri = monaco.Uri.parse(`inmemory://codechronos/${encodeURIComponent(path)}`);
      let model = modelsRef.current.get(path) ?? monaco.editor.getModel(uri);
      if (!model || model.isDisposed()) {
        model = monaco.editor.createModel(value, languageFromPath(path), uri);
        modelsRef.current.set(path, model);
      } else {
        modelsRef.current.set(path, model);
        if (model.getValue() !== value) {
          if (path === active) {
            try {
              applyModelText(editor, model, value, { animate: live, signal });
            } catch {
              model.setValue(value);
            }
          } else {
            model.setValue(value);
          }
        }
      }
    }

    const next = active ? modelsRef.current.get(active) : undefined;
    if (next && editor.getModel() !== next) {
      editor.setModel(next);
    }
    window.setTimeout(() => {
      if (!signal.cancelled) applyingRef.current = false;
    }, live ? 700 : 0);
    editor.updateOptions({
      readOnly: state.mode !== "experiment",
      domReadOnly: false,
    });
  }, []);

  useEffect(() => {
    applyVisible();
  }, [visibleKey, applyVisible, mode]);

  useEffect(() => {
    const models = modelsRef.current;
    return () => {
      for (const model of models.values()) {
        try {
          model.dispose();
        } catch {
          /* already gone */
        }
      }
      models.clear();
    };
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || !historyWheel || mode === "experiment") return;

    const flush = () => {
      rafRef.current = 0;
      const d = pendingDelta.current;
      pendingDelta.current = 0;
      if (d !== 0) nudgeCodeTime(d);
    };

    const onWheel = (e: WheelEvent) => {
      if (e.shiftKey || e.ctrlKey || e.metaKey) return;
      e.preventDefault();
      e.stopPropagation();
      let dy = e.deltaY;
      if (e.deltaMode === 1) dy *= 16;
      if (e.deltaMode === 2) dy *= 600;
      const secondsPerPixel = Math.max(0.012, (duration || 600) / 10000);
      pendingDelta.current += dy * secondsPerPixel;
      if (!rafRef.current) rafRef.current = requestAnimationFrame(flush);
    };

    el.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () => {
      el.removeEventListener("wheel", onWheel, { capture: true });
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [historyWheel, mode, duration, nudgeCodeTime]);

  const onMount = useCallback<OnMount>(
    (editor, monaco) => {
      defineThemes(monaco);
      monaco.editor.setTheme(theme);
      editorRef.current = editor;
      monacoRef.current = monaco;
      applyVisible();

      const disposables: IDisposable[] = [];

      disposables.push(
        editor.onDidChangeModelContent(() => {
          if (applyingRef.current) return;
          const state = useStudio.getState();
          if (state.mode !== "experiment") return;
          const model = editor.getModel();
          if (!model) return;
          updateExperimentFile(state.experimentActiveFile, model.getValue());
        }),
      );

      const publishSelection = (clientX?: number, clientY?: number) => {
        const model = editor.getModel();
        const sel = editor.getSelection();
        if (!model || !sel) {
          setSelection("", null);
          return;
        }
        const text = model.getValueInRange(sel);
        if (!text.trim()) {
          setSelection("", null);
          return;
        }
        const coords = editor.getScrolledVisiblePosition(sel.getStartPosition());
        const rect = editor.getDomNode()?.getBoundingClientRect();
        const x = clientX ?? (rect && coords ? rect.left + coords.left : rect?.left ?? 0);
        const y = clientY ?? (rect && coords ? rect.top + coords.top - 8 : rect?.top ?? 0);
        setSelection(text, { x, y });
      };

      disposables.push(
        editor.onDidChangeCursorSelection(() => {
          publishSelection();
        }),
      );

      disposables.push(
        editor.onContextMenu((e) => {
          e.event.preventDefault();
          e.event.stopPropagation();
          publishSelection(e.event.posx, e.event.posy);
        }),
      );

      editor.updateOptions({ contextmenu: false });

      return () => {
        disposables.forEach((d) => d.dispose());
      };
    },
    [applyVisible, setSelection, theme, updateExperimentFile],
  );

  useEffect(() => {
    monacoRef.current?.editor.setTheme(theme);
  }, [theme]);

  return (
    <div ref={wrapRef} className="relative h-full min-h-0 w-full">
      <Editor
        height="100%"
        theme={theme}
        loading={<div className="p-4 text-xs text-mute">Loading editor…</div>}
        onMount={onMount}
        options={{
          readOnly: mode !== "experiment",
          domReadOnly: false,
          fontSize: compact ? 13 : 13.5,
          fontFamily: "var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, monospace",
          fontLigatures: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          wordWrap: "off",
          lineNumbers: "on",
          renderLineHighlight: "all",
          padding: { top: 10, bottom: 16 },
          smoothScrolling: false,
          cursorBlinking: "smooth",
          tabSize: 4,
          folding: true,
          matchBrackets: "always",
          find: { addExtraSpaceOnTop: false },
          scrollbar: {
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10,
          },
          overviewRulerLanes: 0,
        }}
      />
    </div>
  );
}

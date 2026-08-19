import type { editor as MonacoNS } from "monaco-editor";

/**
 * Patch a Monaco model without setValue (which jumps the viewport to line 1).
 * Keeps the shared prefix/suffix, types a small insertion, restores scroll
 * unless the user is already following the bottom of the file.
 */
export function applyModelText(
  editor: MonacoNS.IStandaloneCodeEditor,
  model: MonacoNS.ITextModel,
  next: string,
  opts?: { animate?: boolean; signal?: { cancelled: boolean } },
): { changed: boolean } {
  const current = model.getValue();
  if (current === next) return { changed: false };

  const scrollTop = editor.getScrollTop();
  const visible = editor.getVisibleRanges()[0];
  const lastLine = model.getLineCount();
  const nearBottom = !visible || visible.endLineNumber >= lastLine - 2;

  const curLines = splitKeep(current);
  const nextLines = splitKeep(next);
  let prefix = 0;
  const maxPrefix = Math.min(curLines.length, nextLines.length);
  while (prefix < maxPrefix && curLines[prefix] === nextLines[prefix]) prefix += 1;

  let suffix = 0;
  const maxSuffix = Math.min(curLines.length - prefix, nextLines.length - prefix);
  while (
    suffix < maxSuffix &&
    curLines[curLines.length - 1 - suffix] === nextLines[nextLines.length - 1 - suffix]
  ) {
    suffix += 1;
  }

  const startLine = prefix + 1;
  const oldMidCount = curLines.length - prefix - suffix;
  const newMid = nextLines.slice(prefix, nextLines.length - suffix);
  const insertOnly = oldMidCount === 0 && newMid.length > 0;
  const midText = joinLines(newMid, next.endsWith("\n") && suffix === 0);

  const range = {
    startLineNumber: Math.min(startLine, model.getLineCount()),
    startColumn: 1,
    endLineNumber: oldMidCount === 0 ? Math.min(startLine, model.getLineCount()) : prefix + oldMidCount,
    endColumn:
      oldMidCount === 0
        ? 1
        : model.getLineMaxColumn(Math.min(prefix + oldMidCount, model.getLineCount())),
  };

  // Pure insert at EOF: start at a new line after the prefix.
  if (insertOnly && prefix === curLines.length) {
    const last = model.getLineCount();
    range.startLineNumber = last;
    range.startColumn = model.getLineMaxColumn(last);
    range.endLineNumber = last;
    range.endColumn = range.startColumn;
  }

  const insertBelow = startLine > (visible?.endLineNumber ?? lastLine);
  const followType = nearBottom && insertBelow;

  const canType =
    Boolean(opts?.animate) &&
    insertOnly &&
    midText.length > 0 &&
    midText.length <= 480 &&
    !opts?.signal?.cancelled;

  if (canType) {
    const lead = insertOnly && prefix === curLines.length && !current.endsWith("\n") ? "\n" : "";
    void typeInto(
      editor,
      model,
      {
        line: range.startLineNumber,
        column: range.startColumn,
        text: lead + (lead ? midText.replace(/^\n/, "") : midText),
      },
      opts?.signal,
      followType,
      scrollTop,
    );
  } else {
    model.pushEditOperations(
      [],
      [{ range, text: insertOnly && prefix === curLines.length && !current.endsWith("\n") && midText ? `\n${midText}` : midText, forceMoveMarkers: true }],
      () => null,
    );
    if (followType) editor.revealLineInCenterIfOutsideViewport(startLine);
    else editor.setScrollTop(scrollTop);
  }

  if (newMid.length && followType) {
    const deco = editor.createDecorationsCollection([
      {
        range: {
          startLineNumber: startLine,
          startColumn: 1,
          endLineNumber: startLine + Math.max(0, newMid.length - 1),
          endColumn: 1,
        },
        options: { isWholeLine: true, className: "ca-typed-line" },
      },
    ]);
    window.setTimeout(() => deco.clear(), 1400);
  }

  return { changed: true };
}

function splitKeep(text: string): string[] {
  if (text === "") return [];
  const lines = text.split("\n");
  if (text.endsWith("\n")) lines.pop();
  return lines;
}

function joinLines(lines: string[], trailingNl: boolean): string {
  if (lines.length === 0) return trailingNl ? "\n" : "";
  return lines.join("\n") + (trailingNl ? "\n" : "");
}

async function typeInto(
  editor: MonacoNS.IStandaloneCodeEditor,
  model: MonacoNS.ITextModel,
  insert: { line: number; column: number; text: string },
  signal: { cancelled: boolean } | undefined,
  follow: boolean,
  restoreTop: number,
) {
  let line = insert.line;
  let column = insert.column;
  let i = 0;
  const total = insert.text.length;
  const chunk = Math.max(2, Math.ceil(total / 20));
  while (i < total) {
    if (signal?.cancelled || model.isDisposed()) return;
    const piece = insert.text.slice(i, i + chunk);
    model.pushEditOperations(
      [],
      [
        {
          range: {
            startLineNumber: line,
            startColumn: column,
            endLineNumber: line,
            endColumn: column,
          },
          text: piece,
          forceMoveMarkers: true,
        },
      ],
      () => null,
    );
    for (const ch of piece) {
      if (ch === "\n") {
        line += 1;
        column = 1;
      } else {
        column += 1;
      }
    }
    i += piece.length;
    if (follow) editor.revealLine(line);
    else editor.setScrollTop(restoreTop);
    await new Promise((r) => setTimeout(r, 18));
  }
  if (!follow) editor.setScrollTop(restoreTop);
}

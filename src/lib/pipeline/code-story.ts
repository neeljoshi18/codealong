import {
  isGarbageOcrLine,
  normalizeOcrText,
  snapshotSource,
} from "@/lib/pipeline/code-from-ocr";
import type { CodeSnapshot } from "@/lib/types";

export type TutorialKind = "evolving" | "episodes";

const STOP_IDENTS = new Set([
  "let",
  "const",
  "var",
  "function",
  "return",
  "else",
  "elif",
  "for",
  "while",
  "class",
  "import",
  "export",
  "from",
  "def",
  "print",
  "async",
  "await",
  "true",
  "false",
  "none",
  "null",
  "this",
  "self",
  "int",
  "void",
  "string",
  "public",
  "private",
  "protected",
  "virtual",
  "using",
  "namespace",
  "template",
  "struct",
  "cout",
  "cin",
  "endl",
  "std",
  "include",
  "iostream",
  "main",
  "input",
]);

export function significantLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.trim() && !/^\s*(\/\/|#|\/\*|\*)/.test(l));
}

export function overlapRatio(a: string, b: string): number {
  const A = new Set(significantLines(a));
  const B = new Set(significantLines(b));
  if (A.size === 0 || B.size === 0) return 0;
  let n = 0;
  for (const line of A) if (B.has(line)) n += 1;
  return n / Math.min(A.size, B.size);
}

export function identifiers(text: string): Set<string> {
  const out = new Set<string>();
  const words = text.match(/\b[A-Za-z_][A-Za-z0-9_]{2,}\b/g) ?? [];
  for (const w of words) {
    if (STOP_IDENTS.has(w) || STOP_IDENTS.has(w.toLowerCase())) continue;
    out.add(w);
  }
  return out;
}

export function identifierOverlap(a: string, b: string): number {
  const A = identifiers(a);
  const B = identifiers(b);
  if (A.size === 0 || B.size === 0) return 0;
  let n = 0;
  for (const x of A) if (B.has(x)) n += 1;
  return n / Math.min(A.size, B.size);
}

/** True when two buffers are the same program, not a later unrelated example. */
export function sameExample(a: string, b: string): boolean {
  if (!a.trim() || !b.trim()) return false;
  const sim = overlapRatio(a, b);
  if (sim >= 0.28) return true;
  const id = identifierOverlap(a, b);
  if (id >= 0.5) return true;
  return id >= 0.34 && sim >= 0.08;
}

export function classifyTutorial(snapshots: CodeSnapshot[]): {
  kind: TutorialKind;
  reason: string;
} {
  if (snapshots.length < 3) {
    return { kind: "episodes", reason: "too few snapshots — treat as separate examples" };
  }
  let evolve = 0;
  let episode = 0;
  for (let i = 1; i < snapshots.length; i++) {
    const prev = snapshots[i - 1];
    const next = snapshots[i];
    const sameLang = prev.language === next.language;
    const a = snapshotSource(prev);
    const b = snapshotSource(next);
    if (sameLang && sameExample(a, b)) evolve += 1;
    else episode += 1;
  }
  if (evolve > episode) {
    return { kind: "evolving", reason: `${evolve} continuing edits vs ${episode} resets` };
  }
  return { kind: "episodes", reason: `${episode} new examples vs ${evolve} continuing edits` };
}

export function lessonFileName(language: string): string {
  if (language === "python") return "lesson.py";
  if (language === "html") return "lesson.html";
  return "lesson.js";
}

function sectionFence(language: string, label: string, file: string): string {
  if (language === "html") return `<!-- --- ${label} (${file}) --- -->`;
  if (language === "python") return `# --- ${label} (${file}) ---`;
  return `// --- ${label} (${file}) ---`;
}

export function stitchLesson(snapshots: CodeSnapshot[], atTime: number): string {
  const upto = snapshots.filter((s) => s.timestamp <= atTime + 0.05);
  const seen: { label: string; file: string; language: string; body: string }[] = [];

  for (const snap of upto) {
    const body = snapshotSource(snap).trimEnd();
    if (!body) continue;
    const last = seen[seen.length - 1];
    if (last && last.body === body) continue;
    if (
      last &&
      last.file === snap.activeFile &&
      last.language === snap.language &&
      overlapRatio(last.body, body) >= 0.32
    ) {
      last.body = body;
      last.label = snap.label;
      continue;
    }
    seen.push({
      label: snap.label,
      file: snap.activeFile,
      language: snap.language,
      body,
    });
  }

  return (
    seen
      .map((s) => `${sectionFence(s.language, s.label, s.file)}\n${s.body}`)
      .join("\n\n") + (seen.length ? "\n" : "")
  );
}

export function filesForMoment(
  snapshots: CodeSnapshot[],
  time: number,
  current: CodeSnapshot,
  kindHint?: TutorialKind,
): Record<string, string> {
  const files: Record<string, string> = {};
  const ordered = [...snapshots].sort((a, b) => a.timestamp - b.timestamp);
  const kind = kindHint ?? classifyTutorial(snapshots).kind;

  if (kind === "evolving") {
    let last: CodeSnapshot | null = null;
    for (const snap of ordered) {
      if (snap.timestamp > time + 0.05) break;
      last = snap;
    }
    const chosen = last ?? current;
    const base = snapshotSource(chosen);
    const incoming = snapshotSource(current);
    const merged =
      chosen.id !== current.id && sameExample(base, incoming)
        ? mergeEvolving(base, incoming).code
        : incoming.trim()
          ? incoming
          : base;
    const file = current.activeFile || chosen.activeFile;
    if (merged.trim()) files[file] = merged.endsWith("\n") ? merged : `${merged}\n`;
    return files;
  }

  // Episodes: only the example on screen. Do not keep leftover files
  // from an earlier grocery/grade/etc. program in the same tutorial.
  Object.assign(files, current.files);

  if (kind !== "episodes") return files;

  const byLang = new Map<string, CodeSnapshot[]>();
  for (const snap of snapshots) {
    if (snap.timestamp > time + 0.05) break;
    const list = byLang.get(snap.language) ?? [];
    list.push(snap);
    byLang.set(snap.language, list);
  }
  for (const [lang, list] of byLang) {
    if (list.length < 2) continue;
    const name = lessonFileName(lang);
    if (files[name] !== undefined) continue;
    const stitched = stitchLesson(list, time);
    if (stitched.trim()) files[name] = stitched;
  }
  return files;
}

function ensureNl(text: string): string {
  if (!text) return "";
  return text.endsWith("\n") ? text : `${text}\n`;
}

function fuzzyEq(a: string, b: string): boolean {
  const na = a.replace(/\s+/g, " ").trim();
  const nb = b.replace(/\s+/g, " ").trim();
  if (na === nb) return true;
  if (!na || !nb) return false;
  const hashInclude = (s: string) => s.replace(/^#?\s*include\b/, "#include");
  if (hashInclude(na) === hashInclude(nb) && /include\s*</.test(na)) return true;
  const strip = (s: string) => s.replace(/\s*\{\s*\.\.\.\s*\}/g, "").replace(/[;{}\s]+$/g, "");
  return strip(na) === strip(nb) && strip(na).length > 6;
}

function expandCollapsedStubs(incoming: string, previous: string): string {
  if (!incoming.includes("{ ... }") && !incoming.includes("{...}")) return incoming;
  const prev = previous.split("\n");
  return incoming
    .split("\n")
    .map((line) => {
      const stub = line.match(/^(\s*.+?)\{\s*\.\.\.\s*\}\s*$/);
      if (!stub) return line;
      const sig = stub[1].replace(/\s+/g, " ").trim();
      for (let i = 0; i < prev.length; i++) {
        const p = prev[i].replace(/\s+/g, " ").trim();
        if (!p.startsWith(sig.replace(/\s*\{\s*$/, "").trim()) && !fuzzyEq(prev[i], stub[1])) {
          continue;
        }
        if (!prev[i].includes("{") && !prev[i + 1]?.includes("{")) continue;
        const block = [prev[i]];
        let depth = (prev[i].match(/\{/g) || []).length - (prev[i].match(/\}/g) || []).length;
        for (let j = i + 1; j < prev.length && depth > 0; j++) {
          block.push(prev[j]);
          depth += (prev[j].match(/\{/g) || []).length;
          depth -= (prev[j].match(/\}/g) || []).length;
        }
        if (block.length > 1) return block.join("\n");
      }
      return line;
    })
    .join("\n");
}

function normLine(line: string): string {
  return line.replace(/\s+/g, " ").trim();
}

function assignmentLhs(line: string): string | null {
  const m = line.match(/^\s*(?:\/\/\s*)?([\w.:>-]+)\s*=/);
  return m ? m[1] : null;
}

function looksLikeFullSource(text: string): boolean {
  const first = text.split("\n").find((l) => l.trim()) ?? "";
  if (!/^\s*#include\b/.test(first)) return false;
  if (!/class\s+\w+/.test(text) || !/int\s+main\s*\(/.test(text)) return false;
  const opens = (text.match(/\{/g) || []).length;
  const closes = (text.match(/\}/g) || []).length;
  return opens >= 2 && closes >= opens - 1;
}

/** Insert new incoming rows into the previous buffer. Never delete existing rows. */
function weaveEvolving(previous: string, incoming: string): string {
  const result = previous.split("\n");
  const pNorm = result.map((l) => normLine(l));

  const find = (n: string, from: number): number => {
    if (!n) return -1;
    for (let i = Math.max(0, from); i < pNorm.length; i++) {
      if (pNorm[i] === n || fuzzyEq(pNorm[i], n)) return i;
    }
    return -1;
  };

  const findLhs = (line: string): number => {
    const left = assignmentLhs(line);
    if (!left) return -1;
    for (let i = 0; i < result.length; i++) {
      if (assignmentLhs(result[i]) === left) return i;
    }
    return -1;
  };

  let last = -1;
  for (const rawLine of incoming.split("\n")) {
    if (isGarbageOcrLine(rawLine)) continue;
    const trimmed = rawLine.trim();
    if (!trimmed) continue;
    let line = rawLine;
    const n = normLine(line);

    if (trimmed.startsWith("//")) {
      const body = trimmed.replace(/^\/\//, "").trim();
      const idx = body ? find(normLine(body), 0) : -1;
      if (idx >= 0) {
        result[idx] = /^\s/.test(result[idx]) ? result[idx].replace(/^(\s*).*$/, `$1${trimmed}`) : line;
        pNorm[idx] = normLine(result[idx]);
        last = idx;
      }
      continue;
    }

    let idx = find(n, last + 1);
    if (idx < 0) idx = find(n, 0);
    if (idx >= 0) {
      last = idx;
      continue;
    }

    const extendIdx = pNorm.findIndex((p, i) => {
      if (!p || p.length < 8) return false;
      const a = p.replace(/;$/, "");
      const b = n.replace(/;$/, "");
      return (b.startsWith(a) && b.length > a.length + 2) || (a.startsWith(b) && a.length > b.length + 2 && i > last);
    });
    if (extendIdx >= 0 && n.length >= pNorm[extendIdx].length) {
      const indent = result[extendIdx].match(/^\s*/)?.[0] ?? "";
      result[extendIdx] = indent && !/^\s/.test(line) ? indent + trimmed : line;
      pNorm[extendIdx] = normLine(result[extendIdx]);
      last = extendIdx;
      continue;
    }

    const lhsIdx = findLhs(line);
    if (lhsIdx >= 0) {
      const indent = result[lhsIdx].match(/^\s*/)?.[0] ?? "";
      result[lhsIdx] = indent && !/^\s/.test(line) ? indent + trimmed : line;
      pNorm[lhsIdx] = normLine(result[lhsIdx]);
      last = lhsIdx;
      continue;
    }

    if (!/^\s/.test(line) && last >= 0) {
      const indent = result[last].match(/^\s*/)?.[0] ?? "";
      if (indent && !trimmed.startsWith("#")) line = indent + trimmed;
    }
    const at = last + 1;
    result.splice(at, 0, line);
    pNorm.splice(at, 0, normLine(line));
    last = at;
  }
  return repairClassClose(result.join("\n"));
}

/** If a new `{` was woven in and the class `};` became the method close, restore it. */
function repairClassClose(text: string): string {
  const main = text.search(/int\s+main\s*\(/);
  if (main < 0 || !/class\s+\w+/.test(text)) return text;
  let head = text.slice(0, main);
  const tail = text.slice(main);
  const opens = (head.match(/\{/g) || []).length;
  const closes = (head.match(/\}/g) || []).length;
  if (opens <= closes) return text;
  if (opens === closes + 1 && /\};\s*$/.test(head)) {
    return head.replace(/\};\s*$/, "    }\n};\n\n") + tail;
  }
  if (opens > closes) {
    return head.replace(/\s*$/, `\n${"    }\n".repeat(opens - closes - 1)}};\n\n`) + tail;
  }
  return text;
}

/** Grow one file: keep scrolled-away prefix, add new rows, never shrink. */
export function mergeEvolving(
  previous: string,
  incoming: string,
): { code: string; recovered: boolean } {
  const prev = (previous || "").replace(/\s+$/, "");
  const raw = (incoming || "").replace(/\s+$/, "");
  if (!raw && prev) return { code: ensureNl(prev), recovered: true };
  if (!raw) return { code: "", recovered: false };
  if (!prev) return { code: ensureNl(normalizeOcrText(raw)), recovered: false };

  const curr = expandCollapsedStubs(normalizeOcrText(raw), prev).replace(/\s+$/, "");
  if (prev === curr) return { code: ensureNl(prev), recovered: false };

  const sim = overlapRatio(prev, curr);
  const currSig = significantLines(curr).length;
  const prevIsCpp = /#include\b|std::/.test(prev);
  const currIsPy =
    /^\s*(import |from |def )/m.test(curr) && !/#include\b|std::/.test(curr);
  const prevIsPy =
    /^\s*(import |from |def |print\()/m.test(prev) && !/#include\b|std::/.test(prev);

  // Unrelated examples (Python grocery → secret_number). Never glue them.
  if (!sameExample(prev, curr) && currSig >= 3 && (!prevIsCpp || currIsPy) && (prevIsPy || currIsPy || !prevIsCpp)) {
    return { code: ensureNl(curr), recovered: false };
  }

  if (looksLikeFullSource(curr) && curr.length >= prev.length && sim >= 0.28) {
    return { code: ensureNl(curr), recovered: curr !== raw };
  }

  const weaved = weaveEvolving(prev, curr);
  const weavedSig = significantLines(weaved).length;
  const prevSig = significantLines(prev).length;
  if (weaved.length >= prev.length || weavedSig >= prevSig) {
    return { code: ensureNl(weaved), recovered: weaved !== prev };
  }

  if (sim >= 0.3) return { code: ensureNl(prev), recovered: true };
  if (currSig >= 3) return { code: ensureNl(curr), recovered: false };
  return { code: ensureNl(prev), recovered: true };
}

export function recoverCutoff(
  current: string,
  previous: string | undefined,
): { code: string; recovered: boolean } {
  if (!previous?.trim()) return { code: ensureNl(current), recovered: false };
  if (!sameExample(previous, current)) {
    return { code: ensureNl(current), recovered: false };
  }
  return mergeEvolving(previous, current);
}

export function preferredActiveFile(
  files: Record<string, string>,
  snap: CodeSnapshot,
  currentActive: string,
): string {
  if (currentActive.startsWith("lesson.") && files[currentActive] !== undefined) {
    return currentActive;
  }
  if (snap.activeFile && files[snap.activeFile] !== undefined) return snap.activeFile;
  if (currentActive && files[currentActive] !== undefined) return currentActive;
  return Object.keys(files)[0] ?? "";
}

export function previousSameFile(
  snapshots: CodeSnapshot[],
  time: number,
  file: string,
): CodeSnapshot | null {
  let best: CodeSnapshot | null = null;
  for (const snap of snapshots) {
    if (snap.timestamp > time + 0.05) continue;
    if (snap.activeFile !== file && snap.files[file] === undefined) continue;
    if (!best || snap.timestamp > best.timestamp) best = snap;
  }
  return best;
}

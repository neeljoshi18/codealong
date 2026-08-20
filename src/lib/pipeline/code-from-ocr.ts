/** Drop VS Code / browser chrome. Never treat a status bar as source. */

const CHROME_LINE = [
  /tsh\s*resolv/i,
  /port\s*:\s*\d{2,5}/i,
  /spaces\s*:\s*\d/i,
  /utf-?8\s+(lf|crlf)/i,
  /\bln\s*\d+\s*,?\s*col\s*\d+/i,
  /scanning\.\./i,
  /\bindexja\b/i,
  /live\s*server/i,
  /\bprettier\b/i,
  /\beslint\b/i,
  /^\s*problems\b/i,
  /^\s*console\s*>>/i,
  /^\s*(javascript|typescript|html|json|c\+\+|ready)\s*$/i,
  /solution explorer/i,
  /package manager/i,
  /intellisense/i,
  /^\s*(utf-?8|lf|crlf)\s*$/i,
  /press any key/i,
  /build succeeded/i,
  /^\s*(project|commit|todo|run|terminal|python console|event log)\s*$/i,
  /external libraries/i,
  /scratches and consoles/i,
  /pycharm/i,
  /^\s*[\w.-]+\.(py|js|ts|tsx|jsx|cpp|h|java|html)\s*$/i,
];

const IDE_CHROME =
  /tsh\s*resolv|port\s*:\s*\d{2,5}|spaces\s*:\s*\d|utf-?8\s+(lf|crlf)|\bln\s+\d+\s*,\s*col\s*\d+|\bindexja\b|[®©].{0,48}index|scanning\.\.|press any key/i;

const KEYWORD =
  /\b(let|const|var|function|return|if|else|elif|for|while|class|import|export|def|print|from|async|await|typeof|switch|case|break|console|include|using|public|private|protected|virtual|void|namespace|template|struct|cout|cin)\b/;

const KEYWORD_G = new RegExp(KEYWORD.source, "gi");

const RESIDUAL_OCR =
  /\b(eint|sint)\s+main\b|\baclass\b|\btinclude\b|\benmployee|\benployee\b|\bemployeel\b|\bvoid se\b/i;

export function hasIdeChrome(text: string): boolean {
  return IDE_CHROME.test(text);
}

export function normalizeOcrLine(line: string): string {
  let s = line.replace(/\u2018|\u2019/g, "'").replace(/\u201c|\u201d/g, '"');
  s = s.replace(/^\s*[|]+/, (m) => " ".repeat(Math.min(4, m.length)));
  s = s.replace(/[|]+\s*$/g, "");
  s = s.replace(/\b(eint|Sint|sint)\s+main\b/g, "int main");
  s = s.replace(/^\s*tinclude\b/, "#include");
  s = s.replace(/^\s*#\s*include\b/, "#include");
  s = s.replace(/^\s*include\s*</, "#include <");
  s = s.replace(/^\s*(aclass|eclass)\b/, "class");
  s = s.replace(/\benmployee/gi, "employee");
  s = s.replace(/\benployee/gi, "employee");
  s = s.replace(/\bemployee[lIi\]]+\d*/g, "employee1");
  s = s.replace(/(\w)\.\s+(\w)/g, "$1.$2");
  s = s.replace(/\bAgel\b/g, "Age");
  s = s.replace(/\bAges]\b/g, "Age;");
  s = s.replace(/""+/g, '"');
  s = s.replace(/;\s+[I|l]\s*$/g, ";");
  s = s.replace(/"j\s*$/g, '"');
  s = s.replace(/[ \t]+$/g, "");
  return s;
}

export function normalizeOcrText(text: string): string {
  return text.split(/\r?\n/).map(normalizeOcrLine).join("\n");
}

export function isGarbageOcrLine(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  if (/^[\W_]{1,8}$/.test(t) && !/^[{}();,[\]]+$/.test(t)) return true;
  if (/press any key/i.test(t)) return true;
  if (/^[-+]?\d{5,}$/.test(t)) return true;
  if (/^(2s|bs|Po|i\.|33)$/i.test(t)) return true;
  if (/^\s*[\w.]+$/.test(t) && !KEYWORD.test(t)) return true;
  if (/^\s*[\w.-]+\.(py|js|ts|tsx|jsx|cpp|h|java|html)\s*$/i.test(t)) return true;
  const letters = (t.match(/[A-Za-z]/g) || []).length;
  if (t.length > 3 && letters < 2) return true;
  const weird = (t.match(/[^\w\s"'`.,;:(){}\[\]<>=+\-*/\\|&!?#]/g) || []).length;
  return t.length > 4 && weird / t.length > 0.25;
}

export function looksGarbledOcr(text: string): boolean {
  if (/[®©¥]/.test(text)) return true;
  if (/\bconsole\.\s+\w+/.test(text)) return true;
  if (/\bindexja\b/i.test(text)) return true;
  if (RESIDUAL_OCR.test(text)) return true;
  const weird = (text.match(/[^\n\r\t\x20-\x7e]/g) || []).length;
  return text.length > 20 && weird / text.length > 0.08;
}

export function snapshotSource(snap: {
  files: Record<string, string>;
  activeFile: string;
}): string {
  return snap.files[snap.activeFile] ?? Object.values(snap.files)[0] ?? "";
}

export function extractCodeOnly(raw: string): { code: string; score: number } {
  const lines = normalizeOcrText(raw).split(/\r?\n/);
  const kept: string[] = [];

  for (const original of lines) {
    if (isGarbageOcrLine(original)) continue;
    let line = original.replace(/^\s*\d{1,3}[:.]?\s+/, "").trimEnd();
    const commentAt = line.search(/\/\*|\/\//);
    if (commentAt > 0 && commentAt < 24 && !KEYWORD.test(line.slice(0, commentAt)) && !/=/.test(line.slice(0, commentAt))) {
      line = line.slice(commentAt);
    }
    const key = line.search(KEYWORD);
    if (
      key > 0 &&
      key < 24 &&
      !/::\s*$/.test(line.slice(0, key)) &&
      !/^\s*#/.test(line) &&
      !/^\s*[\w$.]+\s*=/.test(line)
    ) {
      line = line.slice(key);
    }
    const trimmed = line.trim();
    if (!trimmed) {
      if (kept.length && kept[kept.length - 1] !== "") kept.push("");
      continue;
    }
    if (CHROME_LINE.some((re) => re.test(trimmed))) continue;
    if (/^[^\w/`'"#<{}()]{1,6}$/.test(trimmed)) continue;
    const isKeyword = KEYWORD.test(trimmed);
    const isComment = /^\s*(\/\/|#|\/\*|\*)/.test(trimmed);
    const isMarkup = /^\s*<\/?[a-zA-Z]/.test(trimmed);
    const isBrace = /^\s*[{}();,[\]]+\s*$/.test(trimmed);
    const isAssign = /^\s*[\w$.]+\s*=/.test(trimmed);
    const isAccess = /^\s*(public|private|protected)\s*:/.test(trimmed);
    const isInclude = /^\s*#\s*include\b/.test(trimmed);
    const isUsing = /^\s*using\s+/.test(trimmed);
    const isStream = /std::|<<|>>/.test(trimmed);
    const isDecl = /^\s*[\w:<>*&]+\s+[\w]+\s*([(;=]|::)/.test(trimmed);
    const isCall = /\w+\s*\(.*\)\s*;?\s*$/.test(trimmed);
    if (
      !isKeyword &&
      !isComment &&
      !isMarkup &&
      !isBrace &&
      !isAssign &&
      !isAccess &&
      !isInclude &&
      !isUsing &&
      !isStream &&
      !isDecl &&
      !isCall
    ) {
      continue;
    }
    if ((trimmed.match(/[^\w\s"'`.,;:(){}\[\]<>=+\-*/\\|&!?#$/]/g) || []).length > trimmed.length / 3) {
      continue;
    }
    kept.push(line.replace(/[ \t]+$/g, ""));
  }

  while (kept[0] === "") kept.shift();
  while (kept[kept.length - 1] === "") kept.pop();

  const code = kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  KEYWORD_G.lastIndex = 0;
  const hits =
    (code.match(KEYWORD_G) || []).length +
    (code.match(/^\s*\/\//gm) || []).length +
    (code.match(/<\/?[a-zA-Z]/g) || []).length;
  return { code, score: hits };
}

const STARTS_LIKE_CODE =
  /^(let|const|var|function|def|class|import|from\s|print|if|elif|for|while|try|with|async|using|namespace|struct|template|void|int|public|private|#include|\/\/|#|<!|<html|<head|<body|<script|<meta)/im;

export function isUsableCode(text: string): boolean {
  if (!text || !text.trim()) return false;
  if (hasIdeChrome(text)) return false;
  const { code, score } = extractCodeOnly(text);
  const body = code || text.trim();
  if (body.length < 12) return false;
  if (hasIdeChrome(body)) return false;
  if (score >= 2) return true;
  return /IntroduceYourself|#include|std::|class\s+\w+|int\s+main\s*\(/.test(body);
}

export function isCleanCode(text: string): boolean {
  if (!isUsableCode(text)) return false;
  const { code, score } = extractCodeOnly(text);
  const body = code || text.trim();
  if (looksGarbledOcr(text) || looksGarbledOcr(body)) return false;
  if (score < 2) return false;
  const first = body.split(/\n/).find((l) => l.trim()) ?? "";
  if (/^\s*include\s*</.test(first)) return false;
  if (/class\s+\w+/.test(body) && /\{/.test(body) && !/\}/.test(body)) return false;
  return STARTS_LIKE_CODE.test(first) || /^\s*[\w.]+\s*=/.test(first);
}

export function isCleanSnapshot(snap: {
  files: Record<string, string>;
  activeFile: string;
}): boolean {
  return isCleanCode(snapshotSource(snap));
}

export function isUsableSnapshot(snap: {
  files: Record<string, string>;
  activeFile: string;
}): boolean {
  return isUsableCode(snapshotSource(snap));
}

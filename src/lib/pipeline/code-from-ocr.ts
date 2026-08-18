const CHROME = [
  /utf-?8/i,
  /\bspaces\s*:/i,
  /\blf\b/i,
  /\bcrlf\b/i,
  /\bport\s*:/i,
  /tsh\s*resolver/i,
  /scanning/i,
  /\bln\s*\d/i,
  /\bcol\s*\d/i,
  /live\s*server/i,
  /prettier/i,
  /eslint/i,
  /problems/i,
  /index\.(js|ts|html|nim|ja|je)/i,
  /console\s*>>/i,
  /typescript/i,
  /javascript$/i,
];

const KEYWORD =
  /\b(let|const|var|function|return|if|else|for|while|class|import|export|def|print|from|async|await|typeof|switch|case|break|console)\b/;

export function extractCodeOnly(raw: string): { code: string; score: number } {
  const lines = raw.replace(/\u2018|\u2019/g, "'").replace(/\u201c|\u201d/g, '"').split(/\r?\n/);
  const kept: string[] = [];

  for (const original of lines) {
    let line = original.replace(/^\s*\d{1,3}[:.]?\s+/, "").trimEnd();
    const key = line.search(KEYWORD);
    if (key > 0 && key < 24) line = line.slice(key);
    const trimmed = line.trim();
    if (!trimmed) {
      if (kept.length && kept[kept.length - 1] !== "") kept.push("");
      continue;
    }
    if (CHROME.some((re) => re.test(trimmed))) continue;
    if (/^[^\w/`'"#<{}()]{1,6}$/.test(trimmed)) continue;
    const isKeyword = KEYWORD.test(trimmed);
    const isComment = /^\s*(\/\/|#|\/\*|\*)/.test(trimmed);
    const isMarkup = /^\s*<\/?[a-zA-Z]/.test(trimmed);
    const isBrace = /^\s*[{}();,[\]]+\s*$/.test(trimmed);
    const isAssign = /^\s*[\w$.]+\s*=/.test(trimmed);
    if (!isKeyword && !isComment && !isMarkup && !isBrace && !isAssign) continue;
    if ((trimmed.match(/[^\w\s"'`.,;:(){}\[\]<>=+\-*/\\|&!?#$/]/g) || []).length > trimmed.length / 3) {
      continue;
    }
    kept.push(line.replace(/[ \t]+$/g, ""));
  }

  while (kept[0] === "") kept.shift();
  while (kept[kept.length - 1] === "") kept.pop();

  const code = kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  const hits = (code.match(KEYWORD) || []).length + (code.match(/^\s*\/\//gm) || []).length;
  return { code, score: hits };
}

export function isCleanCode(text: string): boolean {
  const { code, score } = extractCodeOnly(text);
  if (score < 2 || code.length < 12) return false;
  if (CHROME.some((re) => re.test(code) && !/index\.(js|html)/i.test(re.source))) return false;
  if (/TSHResolver|Scanning\.\.|UTF-8|Spaces:|indexja/i.test(code)) return false;
  return /^(let|const|var|function|def|class|import|\/\/|#|<!|<html|<body|<script)/im.test(code);
}

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${pad2(m)}:${pad2(sec)}`;
  return `${m}:${pad2(sec)}`;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function languageFromPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  switch (ext) {
    case "py":
      return "python";
    case "ts":
      return "typescript";
    case "tsx":
      return "typescript";
    case "js":
    case "mjs":
    case "cjs":
      return "javascript";
    case "jsx":
      return "javascript";
    case "json":
      return "json";
    case "html":
    case "htm":
      return "html";
    case "css":
      return "css";
    case "md":
    case "mdx":
      return "markdown";
    case "rs":
      return "rust";
    case "go":
      return "go";
    case "java":
      return "java";
    case "cpp":
    case "cc":
    case "cxx":
      return "cpp";
    case "c":
      return "c";
    case "sh":
      return "shell";
    case "yml":
    case "yaml":
      return "yaml";
    default:
      return "plaintext";
  }
}

export function guessEntrypoint(
  files: Record<string, string>,
  language?: string,
): string {
  const names = Object.keys(files);
  if (names.length === 0) return "main";
  const preferred = [
    "app.py",
    "main.py",
    "index.js",
    "main.js",
    "index.ts",
    "main.ts",
    "App.tsx",
    "index.html",
  ];
  for (const p of preferred) {
    if (files[p] !== undefined) return p;
  }
  if (language === "python") {
    const py = names.find((n) => n.endsWith(".py"));
    if (py) return py;
  }
  if (language === "javascript" || language === "typescript") {
    const js = names.find((n) => /\.(jsx?|tsx?)$/.test(n));
    if (js) return js;
  }
  return names[0];
}

export function filesFingerprint(files: Record<string, string>): string {
  return Object.keys(files)
    .sort()
    .map((k) => `${k}:${files[k].length}:${hash32(files[k])}`)
    .join("|");
}

function hash32(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

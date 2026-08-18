export type SandboxFamily = "python" | "javascript" | "unsupported";

export function sandboxFamily(language: string, files: Record<string, string>): SandboxFamily {
  const names = Object.keys(files);
  if (language === "python" || names.some((n) => n.endsWith(".py"))) return "python";
  if (
    language === "javascript" ||
    language === "typescript" ||
    names.some((n) => /\.(jsx?|tsx?|mjs|cjs)$/.test(n))
  ) {
    return "javascript";
  }
  return "unsupported";
}

export function e2bTemplateHint(family: SandboxFamily): string {
  if (family === "python") return "python";
  if (family === "javascript") return "javascript";
  return "unknown";
}

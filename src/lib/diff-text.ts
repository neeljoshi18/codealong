import { createTwoFilesPatch } from "diff";

export function unifiedDiff(
  original: string,
  modified: string,
  filename = "code",
): string {
  if (original === modified) return "";
  return createTwoFilesPatch(
    filename,
    filename,
    original.endsWith("\n") ? original : `${original}\n`,
    modified.endsWith("\n") ? modified : `${modified}\n`,
  );
}

export function multiFileDiff(
  original: Record<string, string>,
  modified: Record<string, string>,
): string {
  const names = new Set([...Object.keys(original), ...Object.keys(modified)]);
  const parts: string[] = [];
  for (const name of [...names].sort()) {
    const a = original[name] ?? "";
    const b = modified[name] ?? "";
    if (a === b) continue;
    parts.push(unifiedDiff(a, b, name));
  }
  return parts.join("\n");
}

export function flattenFiles(files: Record<string, string>, active?: string): string {
  const keys = Object.keys(files).sort((a, b) => {
    if (a === active) return -1;
    if (b === active) return 1;
    return a.localeCompare(b);
  });
  if (keys.length === 1) return files[keys[0]];
  return keys.map((k) => `// ===== ${k} =====\n${files[k]}`).join("\n\n");
}

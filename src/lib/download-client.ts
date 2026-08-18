"use client";

import JSZip from "jszip";

export async function downloadFilesZip(
  files: Record<string, string>,
  zipName: string,
  note?: string,
) {
  const zip = new JSZip();
  for (const [name, content] of Object.entries(files)) {
    zip.file(name, content);
  }
  if (note) zip.file("CODECHRONOS.md", note);
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = zipName.endsWith(".zip") ? zipName : `${zipName}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}

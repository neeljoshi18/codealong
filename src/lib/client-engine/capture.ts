import { extractCodeOnly, isUsableCode } from "@/lib/pipeline/code-from-ocr";
import { previousSameFile, recoverCutoff } from "@/lib/pipeline/code-story";
import type { CodeSnapshot, VideoReconstruction } from "@/lib/types";
import { ensureClientVideo } from "@/lib/client-engine/download";
import { extractPngFrame } from "@/lib/client-engine/frame";
import { ocrFrameBlob } from "@/lib/client-engine/ocr";

function guessLang(text: string): string {
  if (/^\s*</m.test(text) && /<\/?[a-z]+/i.test(text)) return "html";
  if (/#include\b|std::|int\s+main\s*\(/.test(text)) return "cpp";
  if (/\bpublic\s+class\b|System\.out\.println/.test(text)) return "java";
  if (/\bdef\s+\w+\s*\(|\bimport\s+\w+|print\(/.test(text)) return "python";
  return "javascript";
}

function fileFor(language: string): string {
  if (language === "python") return "app.py";
  if (language === "html") return "index.html";
  if (language === "cpp" || language === "c++") return "main.cpp";
  if (language === "java") return "Main.java";
  return "index.js";
}

export async function captureInBrowser(
  videoId: string,
  time: number,
  rec: VideoReconstruction | null,
  signal?: AbortSignal,
): Promise<{ snapshot: CodeSnapshot; cached: boolean }> {
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  await ensureClientVideo(videoId);
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  const png = await extractPngFrame(videoId, time);
  const raw = await ocrFrameBlob(png);
  const filtered = extractCodeOnly(raw);
  if (!filtered.code || filtered.score < 2 || !isUsableCode(filtered.code)) {
    throw new Error("FRAME_NOT_CODE");
  }
  const language = rec?.language && rec.language !== "plaintext" ? rec.language : guessLang(filtered.code);
  const file = fileFor(language);
  let code = filtered.code.endsWith("\n") ? filtered.code : `${filtered.code}\n`;
  let label = "Extracted from screen";
  let snapshot: CodeSnapshot = {
    id: `ocr${String(Math.floor(time)).padStart(6, "0")}`,
    timestamp: time,
    language,
    activeFile: file,
    files: { [file]: code },
    label,
    origin: "ocr",
  };
  if (rec) {
    const prior = previousSameFile(rec.snapshots, time, file);
    const priorText = prior ? (prior.files[file] ?? Object.values(prior.files)[0]) : undefined;
    if (priorText) {
      const recovered = recoverCutoff(code, priorText);
      code = recovered.code;
      snapshot = {
        ...snapshot,
        files: { [file]: code },
        label: recovered.recovered ? `${label} · filled from earlier frame` : label,
      };
    }
  }
  return { snapshot, cached: false };
}

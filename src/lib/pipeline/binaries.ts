import { join } from "node:path";
import { firstExisting, isEphemeralHost } from "@/lib/paths";

export function pythonBin(): string {
  return (
    firstExisting([
      "/Library/Frameworks/Python.framework/Versions/3.13/bin/python3",
      "/usr/local/bin/python3",
      "/opt/homebrew/bin/python3",
      "/usr/bin/python3",
    ]) ?? "python3"
  );
}

export function ffmpegBin(): string | null {
  return firstExisting([
    process.env.FFMPEG_PATH,
    "/usr/bin/ffmpeg",
    "/usr/local/bin/ffmpeg",
    "/opt/homebrew/bin/ffmpeg",
  ]);
}

export function tesseractBin(): string | null {
  return firstExisting([
    process.env.TESSERACT_PATH,
    "/usr/bin/tesseract",
    "/usr/local/bin/tesseract",
    "/opt/homebrew/bin/tesseract",
  ]);
}

export function denoBin(): string | null {
  return firstExisting([
    join(process.env.HOME ?? "", ".deno/bin/deno"),
    "/usr/local/bin/deno",
    "/root/.deno/bin/deno",
  ]);
}

export function captureToolchain(): { ytDlp: boolean; ffmpeg: boolean; tesseract: boolean } {
  return {
    ytDlp: !isEphemeralHost(),
    ffmpeg: Boolean(ffmpegBin()),
    tesseract: Boolean(tesseractBin()),
  };
}

export function canLiveOcr(): boolean {
  const tools = captureToolchain();
  return !isEphemeralHost() && tools.ffmpeg && tools.tesseract;
}

export { isEphemeralHost };

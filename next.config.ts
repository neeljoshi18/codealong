import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@e2b/code-interpreter",
    "youtube-transcript",
    "openai",
  ],
  transpilePackages: ["youtubei.js", "tesseract.js"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;

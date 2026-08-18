import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@e2b/code-interpreter",
    "youtube-transcript",
    "openai",
  ],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;

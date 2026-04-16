import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a minimal self-contained server in .next/standalone
  // This reduces the Docker image from ~1 GB to ~150 MB
  output: "standalone",
};

export default nextConfig;

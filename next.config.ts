import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The API route reads these from disk, so they have to be traced into the bundle.
  outputFileTracingIncludes: { "/api/ask": ["./data/laws/**"] },
};

export default nextConfig;

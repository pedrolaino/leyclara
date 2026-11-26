import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Los JSON de leyes e índice se leen desde disco en el servidor: hay que incluirlos en el bundle.
  outputFileTracingIncludes: { "/api/ask": ["./data/laws/**", "./data/index/**"] },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pages and the API read these from disk at request time.
  outputFileTracingIncludes: { "/**": ["./data/laws/**"] },
  // The Content-Security-Policy header is set per request in src/proxy.ts.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;

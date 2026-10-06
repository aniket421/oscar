import type { NextConfig } from "next";

/** Baseline security headers for every response. A nonce-based CSP is a later, deliberate step. */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    // Phase 2's placeholder workspace moved to /dashboard in Phase 3.
    return [
      { source: "/app", destination: "/dashboard", permanent: true },
      { source: "/app/:path*", destination: "/dashboard", permanent: true },
    ];
  },
};

export default nextConfig;

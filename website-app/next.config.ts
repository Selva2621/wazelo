import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  compress: true,
  experimental: {
    // Turbopack's dev filesystem cache (beta, on by default in Next 16) grew .next to 5 GB
    // across sessions and made `next dev` thrash disk and RAM. A cold compile is only ~6 s.
    turbopackFileSystemCacheForDev: false,
  },
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },

  async redirects() {
    return [
      // Redirect www to non-www (canonical domain)
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.wazelo.in" }],
        destination: "https://wazelo.in/:path*",
        permanent: true,
      },
      // The About page was removed; old links land on the homepage
      { source: "/about", destination: "/", permanent: true },
    ];
  },
};

export default nextConfig;

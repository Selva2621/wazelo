import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Disabled to prevent double-invocation of useEffect in dev (React Strict Mode).
  // The silent refresh effect uses httpOnly cookie token rotation — running it twice
  // in one mount cycle consumes the refresh token, causing a 401 on the second call.
  reactStrictMode: false,
  // Dev-only badge; bottom-left sat on top of the floating sidebar's account avatar.
  devIndicators: { position: "bottom-right" },
  // Same-origin API: with BACKEND_URL set (and NEXT_PUBLIC_API_URL=/api/v1), the browser
  // calls the API on the frontend's own domain, so the httpOnly refresh cookie is
  // first-party. Cross-site (e.g. app on vercel.app, API on another domain), browsers
  // drop that SameSite=Lax cookie and every page reload logs the user out.
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL;
    if (!backendUrl) return [];
    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendUrl.replace(/\/$/, "")}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Disabled to prevent double-invocation of useEffect in dev (React Strict Mode).
  // The silent refresh effect uses httpOnly cookie token rotation — running it twice
  // in one mount cycle consumes the refresh token, causing a 401 on the second call.
  reactStrictMode: false,
};

export default nextConfig;

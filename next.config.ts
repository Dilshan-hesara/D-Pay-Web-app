import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for the multi-stage Docker build (copies only what's needed to run)
  output: "standalone",

  images: {
    remotePatterns: [
      // Local development
      {
        protocol: "http",
        hostname: "localhost",
        port: "7000",
        pathname: "/api/v1/**",
      },
      // Cloud Run / production API gateway
      {
        protocol: "https",
        hostname: "**",
        pathname: "/api/v1/**",
      },
    ],
  },
};

export default nextConfig;

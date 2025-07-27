import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Disable ESLint during build for CI purposes
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Disable TypeScript errors during build for CI purposes  
    ignoreBuildErrors: false,
  }
};

export default nextConfig;

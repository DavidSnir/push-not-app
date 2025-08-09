import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Ensure headers allow service worker scope on root when deployed behind some hosts
  },
};

export default nextConfig;

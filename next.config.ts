import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  turbopack: { root: process.cwd() },
  agentRules: false,
  devIndicators: false,
};
export default nextConfig;

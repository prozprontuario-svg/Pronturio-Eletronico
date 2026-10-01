import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  serverExternalPackages: ["node:sqlite"],
  turbopack: { root: process.cwd() },
  agentRules: false,
  devIndicators: false,
};
export default nextConfig;

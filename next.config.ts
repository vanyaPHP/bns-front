import path from "node:path";
import type { NextConfig } from "next";

if (process.env.VERCEL && !process.env.BACKEND_URL) {
  throw new Error("BACKEND_URL must be set to the bns-back API origin");
}
const backendUrl = (process.env.BACKEND_URL ?? "http://localhost:4000").replace(/\/+$/, "");

const nextConfig: NextConfig = {
  // Pin the root: a stray lockfile in a parent directory would otherwise be picked up.
  turbopack: {
    root: path.join(__dirname),
  },
  // The browser only talks to this origin, so the session cookie stays first-party.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${backendUrl}/api/:path*` }];
  },
};

export default nextConfig;

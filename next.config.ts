import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the root: a stray lockfile in a parent directory would otherwise be picked up.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;

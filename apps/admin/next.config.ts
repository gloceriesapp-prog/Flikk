import type { NextConfig } from "next";
import path from 'node:path';

const nextConfig: NextConfig = {
  // Opt in for the container build; preserve the existing Vercel build path.
  output: process.env.WEB_STANDALONE === '1' ? 'standalone' : undefined,
  deploymentId: process.env.WEB_RELEASE_SHA,
  turbopack: { root: path.resolve(__dirname, '../..') },
  outputFileTracingRoot: path.resolve(__dirname, '../..'),
  // Admin compiles raw backend/src/**/*.ts, whose relative imports carry
  // explicit NodeNext ".js" extensions (e.g. './errors.js' -> errors.ts).
  // Turbopack cannot rewrite .js->.ts, so the admin build runs on webpack
  // (`next build --webpack`) with this extension alias. See DEPLOY.md.
  experimental: { extensionAlias: { '.js': ['.ts', '.tsx', '.js'] } },
};

export default nextConfig;

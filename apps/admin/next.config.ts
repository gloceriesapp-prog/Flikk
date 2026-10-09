import type { NextConfig } from "next";
import path from 'node:path';

const nextConfig: NextConfig = {
  turbopack: { root: path.resolve(__dirname, '../..') },
  outputFileTracingRoot: path.resolve(__dirname, '../..'),
  // Admin compiles raw backend/src/**/*.ts, whose relative imports carry
  // explicit NodeNext ".js" extensions (e.g. './errors.js' -> errors.ts).
  // Turbopack cannot rewrite .js->.ts, so the admin build runs on webpack
  // (`next build --webpack`) with this extension alias. See DEPLOY.md.
  experimental: { extensionAlias: { '.js': ['.ts', '.tsx', '.js'] } },
};

export default nextConfig;

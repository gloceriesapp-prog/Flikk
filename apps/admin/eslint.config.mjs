import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import adminGuard from "./eslint-rules/require-admin-guard.mjs";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Every admin API handler verifies the admin itself (not only middleware).
  {
    files: ["src/app/api/**/route.ts", "src/app/api/**/route.tsx"],
    plugins: { "admin-guard": adminGuard },
    rules: { "admin-guard/require-admin-guard": "error" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;

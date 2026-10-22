import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import adminGuard from "./eslint-rules/require-admin-guard.mjs";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          group: ["lucide-react", "lucide-react/*", "react-icons", "react-icons/*", "@heroicons/*", "@phosphor-icons/*", "iconoir-react"],
          message: "Use the approved local Iconly exports from @/components/icons. See src/components/icons/README.md.",
        }],
      }],
    },
  },
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

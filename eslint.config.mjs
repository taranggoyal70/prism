import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextCoreWebVitals,
  ...nextTypeScript,
  globalIgnores([
    ".next/**",
    ".vercel/**",
    ".venv/**",
    ".cache/**",
    ".pytest_cache/**",
    ".ruff_cache/**",
    "coverage/**",
    "next-env.d.ts",
  ]),
]);

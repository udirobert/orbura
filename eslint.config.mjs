import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Python virtual env at any depth (may contain JS test fixtures from
    // torch, or in hf-space/.venv's case the full Gradio frontend
    // bundle — 1.4GB of minified JS that OOMs ESLint's Babel parser).
    "**/.venv/**",
    "**/.venv-*/**",
    // Self-hosted MediaPipe vendor files (minified, from
    // @mediapipe/face_mesh). Not our code, not lintable.
    "public/mediapipe/**",
  ]),
  // Conventions that match the codebase's existing style instead of
  // forcing churn on every lint run.
  {
    rules: {
      // _arg / _var means "intentionally unused" — widely used in the
      // stub SDK wrappers under src/lib/sdk/ and in destructuring
      // where only some fields are needed.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
]);

export default eslintConfig;

import js from "@eslint/js"
import tseslint from "typescript-eslint"
import nextPlugin from "@next/eslint-plugin-next"
import reactHooksPlugin from "eslint-plugin-react-hooks"

// Flat config for Next.js + TypeScript
export default [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "dist/**",
      "build/**",
      "coverage/**",
      "BIZRA-Unified-Windows-Installer/**",
      "bizra-genesis-node/**",
      ".bizra-kernel/**",
      "scripts/**",
      "deploy/**",
      "tests/**",
      "performance/**",
      "**/.next/**",
      "lighthouserc.js",
      "vitest.config.ts",
      "playwright.config.ts",
      "*.config.cjs",
      "scripts/*.cjs"
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      "@next/next": nextPlugin,
      "react-hooks": reactHooksPlugin
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "no-console": "warn",
      "prefer-const": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
      "@typescript-eslint/no-explicit-any": "warn"
    }
  },
  // Config for .mjs files (like next.config.mjs)
  {
    files: ["*.config.mjs", "next.config.mjs"],
    languageOptions: {
      globals: {
        process: "readonly",
        require: "readonly",
        module: "readonly"
      }
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "no-undef": "off"
    }
  }
]

import typescriptEslint from "typescript-eslint";
import { defineConfig } from "@eslint/config-helpers";
import js from "@eslint/js";
import pluginJest from "eslint-plugin-jest";

export default defineConfig([
  js.configs.recommended,
  ...typescriptEslint.configs.recommended,
  {
    ignores: ["**/node_modules/**", "**/dist/**", "**/build/**"],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: typescriptEslint.parser,
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
    rules: {
      // Add any custom rules here
    },
  },
  // Jest configuration
  {
    plugins: {
      jest: pluginJest,
    },
    files: ["**/*.spec.ts", "**/*.test.ts", "**/tests/**/*.ts"],
    ...pluginJest.configs["flat/recommended"],
    rules: {
      // Jest-specific rules can be added here
      ...pluginJest.configs["flat/recommended"].rules,
    },
  },
]);

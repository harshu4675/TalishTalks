import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["dist", "dev-dist"]),
  {
    files: ["**/*.{js,jsx}"],
    extends: [js.configs.recommended, reactHooks.configs["recommended-latest"], reactRefresh.configs.vite],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: { ecmaVersion: "latest", ecmaFeatures: { jsx: true }, sourceType: "module" },
    },
    rules: {
      "no-unused-vars": ["error", { varsIgnorePattern: "^[A-Z_]", argsIgnorePattern: "^_", caughtErrors: "none" }],
    },
  },
  {
    files: ["src/app/**/*.jsx", "src/core/**/*.jsx"],
    rules: { "react-refresh/only-export-components": "off" },
  },
  {
    files: ["src/features/**/context/*.jsx"],
    rules: {
      "react-refresh/only-export-components": [
        "error",
        { allowExportNames: ["ChatContext", "FriendsContext"] },
      ],
    },
  },
  {
    files: ["tests/**/*.js", "*.config.js"],
    languageOptions: { globals: globals.node },
  },
  {
    files: ["src/sw.js"],
    languageOptions: { globals: globals.serviceworker },
  },
]);

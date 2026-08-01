import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default [
  { ignores: ["dist"] },
  js.configs.recommended,
  {
    ...reactHooks.configs["recommended-latest"],
    files: ["**/*.{js,jsx}"]
  },
  {
    ...reactRefresh.configs.vite,
    files: ["**/*.{js,jsx}"],
    rules: {
      ...reactRefresh.configs.vite.rules,
      "react-refresh/only-export-components": "off"
    }
  },
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: { ecmaVersion: "latest", ecmaFeatures: { jsx: true }, sourceType: "module" }
    },
    rules: {
      "no-unused-vars": ["error", { varsIgnorePattern: "^[A-Z_]", argsIgnorePattern: "^[A-Z_]" }]
    }
  },
  {
    files: ["vite.config.js"],
    languageOptions: { globals: globals.node }
  }
];

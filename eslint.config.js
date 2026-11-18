import js from "@eslint/js";
import globals from "globals";
export default [
  { ignores: ["node_modules/**", "web/dist/**"] },
  js.configs.recommended,
  {
    files: ["**/*.js", "**/*.mjs", "**/*.jsx"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        __ITER: "readonly",
        __VU: "readonly",
      },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      "no-unused-vars": [
        "error",
        { varsIgnorePattern: "^[A-Z]", argsIgnorePattern: "^_" },
      ],
    },
  },
];

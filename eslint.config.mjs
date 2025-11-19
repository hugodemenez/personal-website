import js from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: [".next/**", "node_modules/**", "out/**", "public/**", "site/**"],
  },
  {
    files: ["scripts/**/*.js"],
    languageOptions: {
      globals: {
        require: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        module: "readonly",
        exports: "readonly",
        process: "readonly",
      },
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "script",
      },
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "no-undef": "off",
    },
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: {
      react,
      "react-hooks": reactHooks,
    },
    languageOptions: {
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
    },
  },
];


import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    files: ["**/*.js", "**/*.ts"],
    ignores: ["node_modules"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module"
    },
    rules: {
      "no-unused-vars": "warn",
      eqeqeq: "error",
      "no-console": "warn"
    },
    env: {
      browser: true,
      es2021: true
    }
  }
];

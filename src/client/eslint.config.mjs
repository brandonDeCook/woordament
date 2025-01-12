const js = require("@eslint/js");

module.exports = [
  js.configs.recommended,
  {
    files: ["**/*.js", "**/*.ts"],
    ignores: ["node_modules"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
    rules: {
      "no-unused-vars": "warn",
      eqeqeq: "error",
      "no-console": "warn",
    },
  },
];

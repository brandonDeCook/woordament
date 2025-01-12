import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    files: ["**/*.js", "**/*.ts"],
    ignores: ["node_modules"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        // Browser-specific globals
        localStorage: "readonly",
        window: "readonly",
        document: "readonly",
        console: "readonly",
        fetch: "readonly",
        navigator: "readonly",
        setTimeout: "readonly",
        // Node.js-specific globals
        require: "readonly",
        module: "readonly",
        process: "readonly",
        __dirname: "readonly"
      }
    },
    rules: {
      "no-unused-vars": "warn",
      eqeqeq: "error",
      "no-console": "warn"
    }
  },
  {
    // Specific configuration for Node.js files (like Webpack)
    files: ["webpack.config.js"],
    languageOptions: {
      globals: {
        require: "readonly",
        module: "readonly",
        process: "readonly",
        __dirname: "readonly"
      }
    }
  }
];

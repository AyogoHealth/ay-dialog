/*! Copyright 2019 Ayogo Health Inc. */

module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    "sourceType": "module",
    "project": "./tsconfig.json"
  },
  env: {
    "es6": true
  },
  plugins: [
    "header",
    "@typescript-eslint"
  ],
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    "brace-style": ["error", "1tbs"],
    "curly": "error",
    "eol-last": ["error", "always"],
    "eqeqeq": "error",
    "guard-for-in": "error",
    "keyword-spacing": ["error", { "before": true, "after": true, "overrides": { "catch": { "after": false } } }],
    "linebreak-style": ["error", "unix"],
    "no-unused-labels": "error",
    "no-caller": "error",
    "no-new-wrappers": "error",
    "no-redeclare": "error",
    "no-eval": "error",
    "no-trailing-spaces": "error",
    "prefer-const": "warn",
    "radix": "error",
    "semi": ["error", "always"],

    "header/header": [2, "block", { "pattern": "Copyright \\d{4} Ayogo Health Inc." }],

    "@typescript-eslint/class-name-casing": "warn",
    "@typescript-eslint/indent": ["error", 2],
    "@typescript-eslint/no-namespace": "error"
  }
};

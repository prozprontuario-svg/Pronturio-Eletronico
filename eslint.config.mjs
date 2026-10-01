import tsParser from "@typescript-eslint/parser";
export default [
  { ignores: [".next/**", "node_modules/**", "design-reference/**"] },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: { parser: tsParser, parserOptions: { ecmaVersion: "latest", sourceType: "module" } },
    rules: {
      "no-unused-vars": "off",
      "no-debugger": "error",
      "no-constant-condition": "error",
      "no-unsafe-finally": "error",
      "eqeqeq": ["error", "always"]
    }
  }
];

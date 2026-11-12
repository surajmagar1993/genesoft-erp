import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Standard exceptions: names left out of ...rest on purpose, and _-prefixed placeholders
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { ignoreRestSiblings: true, argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      // Project rules: placeholders give instructions, never example data; confirmations use the app's dialog
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXAttribute[name.name='placeholder'] > Literal[value=/\\be\\.g\\.?|\\bExample:/i]",
          message: "Placeholders give instructions (\"Enter …\"), not example values.",
        },
        {
          selector: "CallExpression[callee.name='confirm'], CallExpression[callee.object.name='window'][callee.property.name='confirm']",
          message: "Use confirmAction() from @/components/confirm-dialog instead of the browser's confirm().",
        },
      ],
    },
  },
  {
    // The shared dialog falls back to the browser's confirm when it isn't mounted
    files: ["src/components/confirm-dialog.tsx"],
    rules: { "no-restricted-syntax": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // One-off maintenance scripts outside the app source
    "scripts/**",
    "check-migration.ts",
  ]),
]);

export default eslintConfig;

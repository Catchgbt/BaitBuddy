import globals from "globals";
import pluginJs from "@eslint/js";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginUnusedImports from "eslint-plugin-unused-imports";

export default [
  {
    // Global ignores (must be a standalone object in flat config to apply
    // across all files, not just those matched by `files` below).
    // src/components/ui/** = Vendor-Komponenten (shadcn) mit viel Rauschen.
    // .ts/.tsx werden von diesem JS-ESLint nicht geparst (kein
    // @typescript-eslint konfiguriert) — sie laufen über `npm run typecheck`.
    ignores: ["src/components/ui/**/*", "**/*.ts", "**/*.tsx"],
  },
  {
    files: [
      "src/components/**/*.{js,mjs,cjs,jsx}",
      "src/pages/**/*.{js,mjs,cjs,jsx}",
      "src/lib/**/*.{js,mjs,cjs,jsx}",
      "src/hooks/**/*.{js,mjs,cjs,jsx}",
      "src/api/**/*.{js,mjs,cjs,jsx}",
      "src/Layout.jsx",
    ],
    ...pluginJs.configs.recommended,
    ...pluginReact.configs.flat.recommended,
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 2022,
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
    plugins: {
      react: pluginReact,
      "react-hooks": pluginReactHooks,
      "unused-imports": pluginUnusedImports,
    },
    rules: {
      "no-unused-vars": "off",
      "react/jsx-uses-vars": "error",
      "react/jsx-uses-react": "error",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
      "react/prop-types": "off",
      "react/react-in-jsx-scope": "off",
      "react/no-unknown-property": [
        "error",
        { ignore: ["cmdk-input-wrapper", "toast-close"] },
      ],
      "react-hooks/rules-of-hooks": "error",
      // Als "warn", damit `lint --quiet` (CI) nicht rot wird, aber ein volles
      // `eslint .` die Stale-Closure-/Effect-Dependency-Fehlerklasse sichtbar
      // macht — genau die Klasse, die zuletzt mehrfach Bugs verursacht hat.
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    // Backend ist reines ESM ("type":"module"). `require()` ist dort zur Laufzeit
    // NICHT definiert (ReferenceError) — ein solcher Aufruf hat bereits den KI-Buddy
    // in Produktion lahmgelegt, ohne dass die Vitest-Tests es zeigten (Vitest stellt
    // in ESM ein require-Shim bereit). Diese Regel macht künftiges require() im
    // Backend zum harten Lint-Fehler (CI "quality"), Tests hin oder her.
    files: ["backend/**/*.{js,mjs,cjs}", "api/**/*.{js,mjs,cjs}", "shared/**/*.{js,mjs,cjs}"],
    languageOptions: {
      globals: globals.node,
      parserOptions: { ecmaVersion: 2022, sourceType: "module" },
    },
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.name='require']",
          message: "require() ist in diesem ESM-Backend nicht definiert — nutze statische import-Syntax.",
        },
      ],
    },
  },
];

import globals from "globals";
import pluginJs from "@eslint/js";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginUnusedImports from "eslint-plugin-unused-imports";

// Einmaliger Vollscan (Phase 2 des Bug-Testing-Durchgangs): dieselben Regeln
// wie eslint.config.js, aber auf die dort ausgeschlossenen Bereiche
// (src/lib, src/hooks, src/api, src/components/ui) ausgeweitet, um echte
// Bugs (v.a. rules-of-hooks-Verstoesse) aufzudecken. Bewusst NICHT ins
// "lint"-Script gehaengt — die UI-Vendor-Komponenten erzeugen zu viel
// Rauschen fuer ein blockierendes Gate; das ist ein Follow-up.
export default [
  {
    ignores: ["src/components/ui/**/*"],
  },
  {
    files: [
      "src/components/**/*.{js,mjs,cjs,jsx}",
      "src/pages/**/*.{js,mjs,cjs,jsx}",
      // .ts/.tsx bewusst ausgeschlossen: kein TS-Parser konfiguriert (kein
      // @typescript-eslint in diesem Projekt) — diese Dateien werden
      // stattdessen ueber `npm run typecheck` geprueft.
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
    },
  },
];

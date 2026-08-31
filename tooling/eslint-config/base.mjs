import js from "@eslint/js";
import importX from "eslint-plugin-import-x";
import jsdoc from "eslint-plugin-jsdoc";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/coverage/**",
      "**/node_modules/**",
      "**/.turbo/**",
      "app/configs/swagger/docs/**",
      "**/app/configs/swagger/docs/**",
      ".eslintrc.cjs",
      "**/.eslintrc.cjs",
      "**/__tests__/**",
      "**/tests/**",
      "eslint.config.mjs",
      "**/eslint.config.*",
      "tooling/eslint-config/**",
      "**/tsconfig*.json",
      "**/tsconfig.json",
    ],
  },

  js.configs.recommended,

  ...tseslint.configs.recommendedTypeChecked,

  importX.flatConfigs.recommended,

  jsdoc.configs["flat/recommended-typescript"],

  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
      parserOptions: {
        projectService: {
          allowDefaultProject: ["*.config.*", "eslint.config.*"],
        },
      },
    },
    settings: {
      jsdoc: {
        mode: "typescript",
      },
    },
    rules: {
      // ── core style / correctness (turn off core, enable TS-aware where needed) ──
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],

      "no-use-before-define": "off",
      "@typescript-eslint/no-use-before-define": "error",

      "dot-notation": "off",
      "@typescript-eslint/dot-notation": "error",

      "no-empty-function": "off",
      "@typescript-eslint/no-empty-function": "error",

      "no-unused-expressions": "off",
      "@typescript-eslint/no-unused-expressions": "error",

      "default-param-last": "off",
      "@typescript-eslint/default-param-last": "error",

      "require-await": "off",
      "@typescript-eslint/require-await": "error",

      "no-duplicate-imports": "off",

      "no-magic-numbers": "off",
      "@typescript-eslint/no-magic-numbers": [
        "error",
        {
          ignore: [0, 1, -1],
          ignoreArrayIndexes: true,
          ignoreDefaultValues: true,
          ignoreClassFieldInitialValues: true,
          enforceConst: true,
          detectObjects: false,
        },
      ],

      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-for-in-array": "error",
      "@typescript-eslint/no-array-delete": "error",
      "@typescript-eslint/no-dynamic-delete": "error",
      "@typescript-eslint/no-duplicate-enum-values": "error",
      "@typescript-eslint/array-type": ["error", { default: "array" }],
      "@typescript-eslint/method-signature-style": ["error", "property"],
      "@typescript-eslint/return-await": ["error", "in-try-catch"],
      "@typescript-eslint/explicit-function-return-type": [
        "error",
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
          allowDirectConstAssertionInArrowFunctions: true,
        },
      ],
      "@typescript-eslint/explicit-module-boundary-types": "error",

      // ── vanilla ESLint correctness ──
      "array-callback-return": "error",
      "no-constant-condition": "error",
      "no-debugger": "error",
      "no-empty-pattern": "error",
      "no-import-assign": "error",
      "no-irregular-whitespace": "error",
      curly: "error",
      "default-case": "error",
      "max-classes-per-file": ["error", 1],
      "max-depth": ["error", 4],
      "max-lines-per-function": ["error", { max: 200, skipComments: true, skipBlankLines: true }],
      "max-nested-callbacks": ["error", 4],
      "max-params": ["error", 4],
      "no-console": "error",
      "no-delete-var": "error",
      "no-empty": "error",
      "no-nested-ternary": "error",
      "no-new-wrappers": "error",
      "no-object-constructor": "error",
      "no-unneeded-ternary": "error",
      "no-unused-labels": "error",
      "no-var": "error",
      "object-shorthand": ["error", "always", { avoidQuotes: true }],
      "prefer-arrow-callback": "error",
      "prefer-const": "error",
      "prefer-destructuring": "warn",
      "no-duplicate-case": "error",
      "consistent-return": "error",

      // ── import ordering (no-unresolved/namespace disabled — NodeNext .js ↔ .ts mapping) ──
      "import-x/no-unresolved": "off",
      "import-x/namespace": "off",
      "import-x/first": "error",
      "import-x/newline-after-import": "error",
      "import-x/no-duplicates": ["error", { considerQueryString: true }],
      "import-x/no-unassigned-import": "error",
      "import-x/order": [
        "error",
        {
          groups: ["builtin", "external", "parent", "sibling", "index"],
          pathGroupsExcludedImportTypes: ["builtin"],
          alphabetize: { order: "asc" },
          "newlines-between": "always",
        },
      ],
      "sort-imports": ["error", { allowSeparatedGroups: true, ignoreDeclarationSort: true }],

      // ── jsdoc — exported functions only ──
      "jsdoc/require-jsdoc": [
        "error",
        {
          publicOnly: true,
          require: {
            FunctionDeclaration: true,
            MethodDefinition: false,
            ClassDeclaration: false,
            ArrowFunctionExpression: false,
            FunctionExpression: false,
          },
          contexts: [
            "ExportNamedDeclaration > FunctionDeclaration",
            "ExportDefaultDeclaration > FunctionDeclaration",
          ],
        },
      ],
    },
  },

  // JS / CJS / MJS — type-aware rules don't apply
  {
    files: ["**/*.js", "**/*.mjs", "**/*.cjs"],
    extends: [tseslint.configs.disableTypeChecked],
  },

  // Tests — relax magic numbers, jsdoc, and line limits
  {
    files: ["**/tests/**", "**/__tests__/**", "**/*.test.ts", "**/*.spec.ts"],
    rules: {
      "@typescript-eslint/no-magic-numbers": "off",
      "jsdoc/require-jsdoc": "off",
      "max-lines-per-function": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
    },
  },

  // CLI is allowed to write to console
  {
    files: ["apps/cli/**"],
    rules: {
      "no-console": "off",
    },
  },
);

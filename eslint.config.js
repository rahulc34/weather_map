import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import jsdoc from 'eslint-plugin-jsdoc';

const SOURCE_FILES = ['server/src/**/*.js', 'client/src/**/*.{js,jsx}', 'shared/src/**/*.js'];
const TEST_FILES = ['**/*.test.{js,jsx}', '**/tests/**', 'client/src/test/**'];

/** Code-quality gates: small, simple, documented functions. */
const qualityRules = {
  complexity: ['error', 10],
  'max-depth': ['error', 3],
  'max-params': ['error', 4],
  'max-lines': ['error', { max: 250, skipBlankLines: true, skipComments: true }],
  'max-lines-per-function': ['error', { max: 60, skipBlankLines: true, skipComments: true }],
  'max-nested-callbacks': ['error', 3],
  'no-shadow': 'error',
  'no-param-reassign': 'error',
  'no-nested-ternary': 'error',
  'no-else-return': 'error',
  'consistent-return': 'error',
  'prefer-template': 'error',
  'object-shorthand': 'error',
  'no-magic-numbers': 'off',
};

export default [
  { ignores: ['**/node_modules/**', '**/dist/**', '**/coverage/**'] },
  js.configs.recommended,
  {
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
  // Server, shared package + tooling: Node environment.
  {
    files: ['server/**/*.js', 'shared/**/*.js', '*.js', 'client/*.config.js'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: { ...globals.node } },
  },
  // Client: React with strict accessibility linting.
  {
    files: ['client/src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser },
    },
    settings: { react: { version: 'detect' } },
    plugins: { react, 'react-hooks': reactHooks, 'jsx-a11y': jsxA11y },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...react.configs.flat['jsx-runtime'].rules,
      ...reactHooks.configs.flat.recommended.rules,
      ...jsxA11y.flatConfigs.strict.rules,
      'react/prop-types': 'off',
    },
  },
  // Source code: quality limits + complete JSDoc on every exported function.
  {
    files: SOURCE_FILES,
    ignores: TEST_FILES,
    plugins: { jsdoc },
    settings: { jsdoc: { mode: 'typescript' } },
    rules: {
      ...qualityRules,
      ...jsdoc.configs['flat/recommended-typescript-flavor-error'].rules,
      'jsdoc/require-jsdoc': [
        'error',
        {
          publicOnly: true,
          require: {
            FunctionDeclaration: true,
            ArrowFunctionExpression: true,
            FunctionExpression: true,
            ClassDeclaration: true,
          },
        },
      ],
      'jsdoc/require-param-description': 'off',
      'jsdoc/require-returns-description': 'off',
      'jsdoc/require-property-description': 'off',
      'jsdoc/no-undefined-types': 'off',
      'jsdoc/tag-lines': 'off',
      'jsdoc/reject-any-type': 'off',
    },
  },
  // Tests: Vitest + DOM globals.
  {
    files: TEST_FILES,
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
];

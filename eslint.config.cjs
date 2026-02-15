const js = require('@eslint/js');
const globals = require('globals');
const tseslint = require('typescript-eslint');
const reactHooks = require('eslint-plugin-react-hooks');
const reactRefresh = require('eslint-plugin-react-refresh');

const relaxedRules = {
  '@typescript-eslint/no-explicit-any': 'off',
  '@typescript-eslint/no-unused-vars': 'off',
  'prefer-const': 'off',
  'no-case-declarations': 'off',
  'no-control-regex': 'off',
};

module.exports = tseslint.config(
  {
    ignores: ['dist/**', 'dist-electron/**', 'node_modules/**', '**/*.d.ts', 'eslint.config.cjs'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      ...relaxedRules,
    },
  },
  {
    files: ['electron/**/*.ts', 'vite.config.ts', 'tailwind.config.js', 'postcss.config.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      ...relaxedRules,
    },
  }
);

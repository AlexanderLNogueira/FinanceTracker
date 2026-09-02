import globals from 'globals';
import js from '@eslint/js';

const { browser, node } = globals;

export default [
  {
    ignores: ['**/node_modules/**', 'js/vendor/**'],
  },

  // js modules run ONLY in the browser -> browser globals, tight scoping.
  // Chart is added because the vendored Chart.js exposes a global of that name.
  {
    files: ['js/**/*.js'],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...browser,
        Chart: 'readonly',
      },
    },
  },

  // Tests and the ESLint config run under Node.
  // globalThis is added because the tests mock globalThis.localStorage.
  {
    files: ['tests/**/*.js', 'eslint.config.js'],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...node,
        globalThis: 'readonly',
      },
    },
  },
];
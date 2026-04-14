const tseslint = require('typescript-eslint');
const stockOrbitPlugin = require('./eslint-rules');

module.exports = tseslint.config(
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [tseslint.configs.base],
    plugins: {
      'stock-orbit': stockOrbitPlugin,
    },
    rules: {
      'stock-orbit/no-hardcoded-colors': 'error',
      'stock-orbit/no-hardcoded-spacing': 'warn',
      'stock-orbit/no-direct-css-var': 'error',
      'stock-orbit/no-alpha-concat': 'error',
      'stock-orbit/no-semantic-in-ui': 'off',
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['@/shared/styles/vars'],
            message: 'Use sem.* from @/shared/styles/semantic instead.',
          },
          {
            group: ['@/shared/styles/theme'],
            message: 'Theme is internal. Use sem.* or useTheme() from store/selectors.',
          },
        ],
      }],
    },
  },
  {
    files: ['src/shared/styles/**/*.ts'],
    rules: {
      'stock-orbit/no-hardcoded-colors': 'off',
      'stock-orbit/no-direct-css-var': 'off',
      'stock-orbit/no-semantic-in-ui': 'off',
      'no-restricted-imports': 'off',
    },
  },
  {
    files: ['src/app/providers/**/*.tsx', 'src/app/store/**/*.ts'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
);

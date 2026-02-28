module.exports = {
  singleQuote: true,
  arrowParens: 'always',
  printWidth: 100,
  eslintRules: {
    'max-len': ['error', { code: 100, ignoreComments: true, ignorePattern: '^import .*' }],
    'prettier/prettier': 'error',
    'import/no-extraneous-dependencies': [
      'error',
      {
        devDependencies: [
          '**/*.test.ts',
          '**/*.test.tsx',
          './*.config.ts',
          'src/tests/setup.ts',
          'src/**/*.spec.ts',
          'src/__tests__/*.ts',
        ],
      },
    ],
  },
};

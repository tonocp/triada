import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import prettier from 'eslint-plugin-prettier';
import vue from 'eslint-plugin-vue';
import globals from 'globals';
import { createRequire } from 'module';
import vueParser from 'vue-eslint-parser';

const require = createRequire(import.meta.url);
const { eslintRules } = require('./common.config.cjs');

export default [
  ...vue.configs['flat/recommended'],
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      'android/**',
      'prettier.config.cjs',
      'ios/**',
      'android/app/src/main/assets/public/**',
      'ios/App/App/public/**',
      'tailwind.config.ts',
      'vitest.config.ts',
      'cypress.config.ts',
    ],
    files: ['**/*.{js,ts,tsx,vue,cjs,mjs}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2021,
        ...globals.jest,
        ...globals.node,
        cy: 'readonly',
        Cypress: 'readonly',
      },
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: vueParser,
      parserOptions: {
        parser: typescriptParser,
        project: ['./tsconfig.eslint.json'],
        extraFileExtensions: ['.vue'],
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
      vue,
      prettier,
    },
    rules: {
      ...eslintRules,
      'no-undef': 'off',
      'no-unused-vars': 'off',
      'no-console': 'off',
      'no-shadow': 'off',
      'object-curly-newline': 'off',
      'implicit-arrow-linebreak': 'off',
      'operator-linebreak': 'off',
      'function-paren-newline': 'off',
      'comma-spacing': 'off',
      'no-spaced-func': 'off',
      'func-call-spacing': 'off',
      'no-plusplus': 'off',
      'no-extra-boolean-cast': 'off',
      'no-return-await': 'off',
      'default-param-last': 'off',
      'class-methods-use-this': 'off',
      'no-underscore-dangle': 'off',
      'no-use-before-define': 'off',
      'no-confusing-arrow': 'off',
      'no-restricted-syntax': 'off',
      'no-param-reassign': 'off',
      'symbol-description': 'off',
      'import/prefer-default-export': 'off',
      'import/extensions': 'off',
      'import/order': 'off',
      'import/no-cycle': 'off',
      'import/no-extraneous-dependencies': 'off',
      '@typescript-eslint/strict-boolean-expressions': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/return-await': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/naming-convention': 'off',
      '@typescript-eslint/indent': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-shadow': 'warn',
      'vue/multi-word-component-names': 'off',
      'vue/attributes-order': 'off',
      'vue/order-in-components': 'off',
      'vue/this-in-template': 'off',
      'vue/require-default-prop': 'off',
      'vue/no-template-shadow': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/max-attributes-per-line': 'off',
      'vue/html-self-closing': 'off',
      'vue/multiline-html-element-content-newline': 'off',
      'vue/html-indent': 'off',
      'vue/html-closing-bracket-newline': 'off',
      'vue/html-closing-bracket-spacing': 'off',
      'max-len': 'off',
    },
    settings: {
      'import/resolver': {
        alias: {
          map: [
            ['@src', './src'],
            ['@Shared', './src/modules/shared'],
          ],
          extensions: ['.js', '.jsx', '.ts', '.tsx', '.json', '.vue'],
        },
      },
    },
  },
  {
    files: ['**/*.cjs'],
    languageOptions: { sourceType: 'commonjs' },
  },
];

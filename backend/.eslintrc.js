module.exports = {
  env: {
    browser: false,
    es2021: true,
    node: true,
    jest: true
  },
  extends: [
    'airbnb-base',
  ],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
  },
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'no-unused-vars': ['error', { argsIgnorePattern: 'next|req|res|err' }],
    'comma-dangle': ['error', 'never'],
    'max-len': ['warn', { code: 120, ignoreComments: true, ignoreUrls: true }],
    'object-curly-newline': ['error', {
      ObjectExpression: { multiline: true, minProperties: 6 },
      ObjectPattern: { multiline: true, minProperties: 6 },
      ImportDeclaration: { multiline: true, minProperties: 6 },
      ExportDeclaration: { multiline: true, minProperties: 6 }
    }],
    // Disable rules that are problematic in our current setup
    'radix': 'off',
    'no-return-await': 'off',
    'class-methods-use-this': 'off',
    'consistent-return': 'off',
    'camelcase': 'off',
    'no-case-declarations': 'off',
    'no-plusplus': 'off',
    'global-require': 'off',
    'import/no-extraneous-dependencies': ['error', { devDependencies: ['**/*.test.js', '**/*.spec.js', '**/tests/**', '**/jest.config.js'] }],
    // Allow certain patterns common in our codebase
    'no-param-reassign': ['error', { props: false }],
    'prefer-destructuring': 'off',
    'no-await-in-loop': 'off',
    'no-restricted-syntax': 'off',
    'guard-for-in': 'off'
  },
};
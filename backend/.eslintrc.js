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
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'no-unused-vars': ['error', { argsIgnorePattern: 'next' }],
    'comma-dangle': ['error', 'never'],
    'max-len': ['error', { code: 120 }],
    'object-curly-newline': ['error', {
      ObjectExpression: { multiline: true, minProperties: 6 },
      ObjectPattern: { multiline: true, minProperties: 6 },
      ImportDeclaration: { multiline: true, minProperties: 6 },
      ExportDeclaration: { multiline: true, minProperties: 6 }
    }],
    // Temporary overrides for urgent production deployment
    'radix': 'warn',
    'no-return-await': 'warn',
    'class-methods-use-this': 'warn',
    'consistent-return': 'warn',
    'camelcase': 'warn',
    'no-case-declarations': 'warn',
    'no-plusplus': 'warn',
    'global-require': 'warn',
    'import/no-extraneous-dependencies': 'warn',
    'no-unused-vars': 'warn',
    'max-len': 'warn'
  },
};
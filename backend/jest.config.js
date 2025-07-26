module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/config/*.js',
    '!src/**/__mocks__/**'
  ],
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/'
  ],
  coverageThreshold: {
    global: {
      branches: 8,
      functions: 10,
      lines: 12,
      statements: 12
    }
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testTimeout: 30000,
  forceExit: true,
  detectOpenHandles: true,
  verbose: true,
  bail: false, // Continue running tests even if some fail
  clearMocks: true,
  resetMocks: true
};
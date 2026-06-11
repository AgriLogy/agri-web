/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom',
  setupFiles: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // Resolve shared workspace packages to their TS source so babel-jest
    // transforms them (avoids the node_modules transform-ignore problem).
    '^@agri/api-client/(.*)$': '<rootDir>/../../packages/api-client/src/$1',
    '^@agri/api-client$': '<rootDir>/../../packages/api-client/src/index.ts',
    '^@agri/sensor-catalog$':
      '<rootDir>/../../packages/sensor-catalog/src/index.ts',
    '^@agri/i18n$': '<rootDir>/../../packages/i18n/src/index.ts',
    '\\.(scss|css)$': '<rootDir>/__mocks__/styleMock.js',
  },
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': [
      'babel-jest',
      { configFile: './babel.config.test.js' },
    ],
  },
  testMatch: ['<rootDir>/src/**/*.test.(ts|tsx)'],
};

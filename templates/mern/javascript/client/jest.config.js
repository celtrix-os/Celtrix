export default {
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    "\\.css$": "<rootDir>/__mocks__/fileMock.js",
    "\\.svg$": "<rootDir>/__mocks__/fileMock.js"
  },
  // This new line tells Jest to run our setup file before the tests
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};
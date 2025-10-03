export default {
  preset: 'ts-jest',
  testEnvironment: 'jest-environment-jsdom',
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        // This is the complete configuration ts-jest needs
        tsconfig: {
          "jsx": "react-jsx",
          "esModuleInterop": true,
          // This is the line we were missing in the last step
          "types": ["vite/client", "@testing-library/jest-dom"]
        },
      },
    ],
  },
  moduleNameMapper: {
    "\\.css$": "<rootDir>/__mocks__/fileMock.js",
    "\\.svg$": "<rootDir>/__mocks__/fileMock.js"
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};
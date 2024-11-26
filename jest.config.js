const nextJest = require('next/jest');

// Load Next.js configuration and environment variables for Jest
const createJestConfig = nextJest({
  dir: './', // Path to Next.js app
});

// Custom Jest configuration
const customJestConfig = {
  // Setup files that will be run after the test environment is set up
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Use jsdom for DOM-related tests
  testEnvironment: 'jest-environment-jsdom',

  // Ignore files/folders from test runs
  testPathIgnorePatterns: [
    '<rootDir>/.next/', 
    '<rootDir>/node_modules/'
  ],

  // Map module paths to simplify imports based on Next.js module aliases
  moduleNameMapper: {
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/pages/(.*)$': '<rootDir>/pages/$1',
    '^@/contexts/(.*)$': '<rootDir>/contexts/$1',
    '^@/services/(.*)$': '<rootDir>/services/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy', // Mock CSS imports
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/__mocks__/fileMock.js', // Mock image imports
  },

  // Configure Jest to collect code coverage information
  collectCoverage: true,
  collectCoverageFrom: [
    '<rootDir>/components/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/pages/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/contexts/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/services/**/*.{js,jsx,ts,tsx}',
    '!<rootDir>/node_modules/', // Exclude node_modules
    '!<rootDir>/.next/',        // Exclude Next.js build output
  ],

  // Configure how coverage information is reported
  coverageReporters: ['json', 'lcov', 'text', 'clover'],

  // Set up transformation rules for Jest to understand different file types
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest', // Use babel-jest to transpile JS/TS files
  },

  // Control verbose test result output
  verbose: true,

  // Configure Jest to clear mocks between tests
  clearMocks: true,
};

module.exports = createJestConfig(customJestConfig);

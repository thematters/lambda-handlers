/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  extensionsToTreatAsEsm: ['.ts'],
  preset: 'ts-jest',
  testEnvironment: 'node',
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$',
  testPathIgnorePatterns: ['/node_modules/', '/matters-server/'],
  globalSetup: '<rootDir>/matters-server/db/testSetup.js',
  globalTeardown: '<rootDir>/matters-server/db/testTeardown.js',
  transform: {
  '\\.tsx?$': ['ts-jest', {
    useESM: true,
  }]
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  }
};

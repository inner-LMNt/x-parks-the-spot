const nextJest = require('next/jest')

const createJestConfig = nextJest({
    dir: './',
})

const customJestConfig = {
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    testEnvironment: 'jest-environment-jsdom',
    testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
	coveragePathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],

    // Add moduleNameMapper for alias resolution
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',  // Adjust based on your project structure
    },
}

module.exports = createJestConfig(customJestConfig)

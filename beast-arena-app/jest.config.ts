import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        // Override strict settings for tests
        strict: true,
        esModuleInterop: true,
        jsx: 'react-jsx',
        module: 'commonjs',
        moduleResolution: 'node',
        baseUrl: '.',
        paths: { '@/*': ['src/*'] },
      },
    }],
  },
  // Ignore expo/react-native modules
  transformIgnorePatterns: [
    'node_modules/(?!(zustand)/)',
  ],
};

export default config;

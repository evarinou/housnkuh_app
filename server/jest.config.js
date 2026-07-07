module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // Mehrere Suiten starten je einen MongoMemoryServer (+ teils Puppeteer-Chrome);
  // mit einem Worker pro Kern verhungern einzelne Suiten unter Volllast (Timeouts)
  maxWorkers: '50%',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  moduleNameMapper: {
    // uuid >= 13 ist ESM-only und bricht ts-jest im CJS-Modus
    '^uuid$': '<rootDir>/tests/uuidStub.ts'
  },
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts'
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts']
};
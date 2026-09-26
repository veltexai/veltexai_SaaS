const nextJest = require("next/jest");

const createJestConfig = nextJest({
  dir: "./",
});

const customJestConfig = {
  testEnvironment: "node",
  // The R2 outbox spike uses Node's native test runner so it can remain a
  // dependency-free executable evidence harness. Jest otherwise discovers the
  // `.test.mjs` file, executes its Node tests, and then incorrectly reports an
  // empty Jest suite. The native suite is run explicitly by the R2 validator.
  testPathIgnorePatterns: [
    "/node_modules/",
    "/quality/r2-hosted-verification-20260925/u8-local-spike/",
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
};

module.exports = createJestConfig(customJestConfig);

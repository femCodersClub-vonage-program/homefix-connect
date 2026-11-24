import { defineConfig } from 'vitest/config';

import { TEST_DATABASE_URL } from './tests/integration/helpers/test-db-url';

// B5: tests de integración contra Postgres real (homefix_test).
// Requisito: `docker compose up -d`. Se lanzan con `pnpm --filter backend test:integration`.
export default defineConfig({
  test: {
    include: ['tests/integration/**/*.test.ts'],
    env: { DATABASE_URL: TEST_DATABASE_URL, NODE_ENV: 'test' },
    globalSetup: ['tests/integration/global-setup.ts'],
    // Comparten la misma BD: un fichero detrás de otro.
    fileParallelism: false,
  },
});

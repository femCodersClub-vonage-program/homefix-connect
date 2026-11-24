import { configDefaults, defineConfig } from 'vitest/config';

// B5: los tests de integración (Postgres real) no entran en `pnpm test`.
// Se lanzan con `pnpm --filter backend test:integration` (vitest.integration.config.ts).
export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, 'tests/integration/**'],
  },
});

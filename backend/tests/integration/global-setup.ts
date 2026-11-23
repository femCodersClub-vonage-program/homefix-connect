import { execSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertTestDatabaseUrl, TEST_DATABASE_URL } from './helpers/test-db-url.js';

const backendDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

// Se ejecuta una vez antes de todos los tests de integración:
// crea/actualiza el esquema en homefix_test (Postgres de docker compose).
export default function setup(): void {
  assertTestDatabaseUrl(TEST_DATABASE_URL);
  execSync('pnpm exec prisma db push --skip-generate', {
    cwd: backendDir,
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: 'inherit',
  });
}

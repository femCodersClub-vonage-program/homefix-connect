// B5 · URL de la BD de los tests de integración (nunca la de desarrollo).
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://homefix:homefix@localhost:5432/homefix_test?schema=public';

/** Aborta si la BD no se llama `*_test`: los tests borran datos. */
export function assertTestDatabaseUrl(url: string | undefined): void {
  const name = url ? new URL(url).pathname.replace(/^\//, '') : '';
  if (!name.endsWith('_test')) {
    throw new Error(
      `Los tests de integración solo se ejecutan contra una BD *_test (recibido: "${name || 'ninguna'}")`,
    );
  }
}

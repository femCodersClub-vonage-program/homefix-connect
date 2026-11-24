import { readFileSync } from 'node:fs';

// A5 · Payloads de Session Monitoring de Vonage Video.
// Estructura y campos según la documentación oficial (ver README.md de esta carpeta).

export type VonageVideoFixture =
  | 'session-created'
  | 'session-destroyed'
  | 'connection-destroyed'
  | 'stream-created';

/** Lee un payload de ejemplo y le aplica cambios (p. ej. el `sessionId` del test). */
export function vonageVideoEvent(
  name: VonageVideoFixture,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  const raw = readFileSync(new URL(`./${name}.json`, import.meta.url), 'utf8');
  return { ...(JSON.parse(raw) as Record<string, unknown>), ...overrides };
}

/** Igual que `vonageVideoEvent`, pero ya serializado (cuerpo crudo para firmar). */
export function vonageVideoEventBody(
  name: VonageVideoFixture,
  overrides: Record<string, unknown> = {},
): string {
  return JSON.stringify(vonageVideoEvent(name, overrides));
}

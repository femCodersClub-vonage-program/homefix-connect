# A5 · Tests de vídeo (unit + integración) — Validación

> Spec: [`02-specification.md`](./02-specification.md) · Plan: [`03-plan.md`](./03-plan.md) · Issue: #11

## Resultado de los tests

Rama `test/A5-video` (sobre `feat/A4-video-webhook` `e8adda3` + `test/B5-messaging` `b6442dc`), 24/11:

```text
$ pnpm check                          → lint + typecheck OK
$ pnpm test   (backend, sin Docker)   → Test Files 11 passed · Tests 124 passed   ← sin cambios
$ pnpm --filter backend test:integration
✓ tests/integration/video-session.repo.int.test.ts (4 tests)
✓ tests/integration/video-tokens.int.test.ts (4 tests)
✓ tests/integration/video-events.int.test.ts (5 tests)
(+ los 8 de la B5)
```

Confirmado en local (Windows, PowerShell, Docker Desktop con `homefix-db`), 24/11 13:31:

```text
$ docker compose up -d
$ pnpm --filter backend test:integration
✓ tests/integration/video-events.int.test.ts (5 tests)
✓ tests/integration/post-visit.int.test.ts (4 tests)
✓ tests/integration/video-tokens.int.test.ts (4 tests)
✓ tests/integration/notification.repo.int.test.ts (4 tests)
✓ tests/integration/video-session.repo.int.test.ts (4 tests)
Test Files  5 passed (5) · Tests  21 passed (21)
```

## Criterios de aceptación

| Criterio | Evidencia | Resultado |
|---|---|---|
| CA-1 · `pnpm test` intacto | 124/124, igual que la rama base | ✅ |
| CA-2 · `test:integration` pasa (B5 + A5) | 21/21 con Docker en Windows (8 B5 + 13 A5) | ✅ |
| CA-3 · Repetible | Dos ejecuciones seguidas en verde | ✅ |
| CA-4 · Detecta fallos | Quitando la idempotencia de `video-events.ts`, INT-V10 falla; restaurado, pasa | ✅ |
| CA-5 · `pnpm check` | OK | ✅ |

## Hallazgos

- No se encontraron fallos en A3 ni en A4 con BD real.
- (B5, no bloquea) `pnpm typecheck` solo mira `src/`, así que los ficheros de `tests/` y `vitest.integration.config.ts` no se comprueban. Con un tsconfig que los incluya salen 2 avisos en ficheros de la B5 (`$queryRaw` puede ser `undefined` y un import sin `.js`). Se puede arreglar en #49.

## Pendiente

- Q1 (contrato/Pact) en el sync del 24/11.
- Publicar Q1–Q6 en el #11.

## Cambio 24/11 (tarde): estructura del issue #11

- `tests/unit/` ← `vonage-video.service.test.ts` · `tests/contract/` ← `video-tokens` y `video-events` (Supertest) · `tests/fixtures/vonage-video/` con los payloads oficiales.
- `pnpm test` → 11 files · **128 passed** (124 + 4 casos nuevos del webhook). `pnpm check` OK.
- `test:integration` en Windows con Docker: 5 files · **21 passed** (8 B5 + 13 A5), con el payload oficial.

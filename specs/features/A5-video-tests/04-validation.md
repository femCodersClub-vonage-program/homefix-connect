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

> ⚠️ La ejecución de `test:integration` del 24/11 se hizo en un entorno sin Docker ni binarios de Prisma: Postgres 16 local y el cliente de Prisma con driver adapter (`@prisma/adapter-pg`), **solo para verificar, sin commitear nada de eso**. Los 13 tests de la A5 pasaron. Falta repetirlo en Windows con Docker (`homefix-db`) antes de marcar el PR como listo.

## Criterios de aceptación

| Criterio | Evidencia | Resultado |
|---|---|---|
| CA-1 · `pnpm test` intacto | 124/124, igual que la rama base | ✅ |
| CA-2 · `test:integration` pasa (B5 + A5) | 13/13 de la A5 en verificación local; falta confirmarlo con Docker | ⏳ |
| CA-3 · Repetible | Dos ejecuciones seguidas en verde | ✅ |
| CA-4 · Detecta fallos | Quitando la idempotencia de `video-events.ts`, INT-V10 falla; restaurado, pasa | ✅ |
| CA-5 · `pnpm check` | OK | ✅ |

## Hallazgos

- No se encontraron fallos en A3 ni en A4 con BD real.
- (B5, no bloquea) `pnpm typecheck` solo mira `src/`, así que los ficheros de `tests/` y `vitest.integration.config.ts` no se comprueban. Con un tsconfig que los incluya salen 2 avisos en ficheros de la B5 (`$queryRaw` puede ser `undefined` y un import sin `.js`). Se puede arreglar en #49.

## Pendiente

- Repetir `test:integration` con Docker en Windows.
- Q1 (contrato/Pact) en el sync del 24/11.
- Publicar Q1–Q6 en el #11.

# A3 · POST /api/video-tokens — Validación

> Spec: [`02-specification.md`](./02-specification.md) · Plan: [`03-plan.md`](./03-plan.md) · Issue: #9

## Resultado de los tests

```text
$ pnpm --filter backend test
 ✓ src/__tests__/stubs.test.ts (6 tests)
 ✓ src/__tests__/app.test.ts (4 tests)
 ✓ src/__tests__/video-tokens.test.ts (11 tests)
 Tests  21 passed (21)

$ pnpm check
 eslint + typecheck backend/frontend → sin errores
```

## Criterios de aceptación

| Criterio | Test | Resultado |
|---|---|---|
| CA-01 · Inquilina entra (primer acceso): 200, sesión creada y `ACTIVE` | `video-tokens.test.ts` | ✅ |
| CA-02 · Técnica entra a sesión activa: misma `sessionId` | `video-tokens.test.ts` | ✅ |
| CA-03 · Cabeceras ausentes, rol inválido o sin `incidentId` → 400 | `video-tokens.test.ts` (3 tests) | ✅ |
| CA-04 · Incidencia inexistente → 404 | `video-tokens.test.ts` | ✅ |
| CA-05 · Gestora → 403 | `video-tokens.test.ts` | ✅ |
| CA-06 · Rol que no coincide → 403 | `video-tokens.test.ts` | ✅ |
| CA-07 · Visita no `CONFIRMED` o incidencia no `VISIT_ASSIGNED` → 409 | `video-tokens.test.ts` (2 tests) | ✅ |
| CA-08 · Sesión `ENDED` → 409 | `video-tokens.test.ts` | ✅ |

## Proceso TDD

1. Fase roja: commit `test(A3): add contract tests ... (red)`: 10 de 11 tests fallaban (404, la ruta no existía).
2. Fase verde: commit `feat(A3): implement POST /api/video-tokens (green)`: 21/21 en verde.

## Pendientes

- `VideoService` usa el stub `InMemoryVideoService` hasta que A1/A2 implementen Vonage real.
- Probar contra la BD real (`pnpm db:seed` + `curl`) cuando Docker esté levantado.
- PR pendiente del merge de #30 (X1) y #31 (T1).
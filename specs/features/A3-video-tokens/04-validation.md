# A3 · POST /api/video-tokens — Validación

> Spec: [`02-specification.md`](./02-specification.md) · Plan: [`03-plan.md`](./03-plan.md) · Issue: #9

## Resultado de los tests

Tras el rebase sobre `main` (16/11), con Node 24:

```text
$ pnpm test
 backend
 ✓ src/__tests__/verifyVonageSignature.test.ts (9 tests)
 ✓ src/__tests__/app.test.ts (4 tests)
 ✓ src/__tests__/video-tokens.test.ts (13 tests)
 Test Files  5 passed (5)
      Tests  52 passed (52)
 frontend
 ✓ src/App.test.tsx (3 tests)

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
| CA-09 · Dos peticiones simultáneas → una sola sesión de Vonage | `video-tokens.test.ts` | ✅ |
| Con `vonageSessionId` existente no se llama a `createSession` | `video-tokens.test.ts` | ✅ |

## Proceso TDD

1. Fase roja: commit `test(A3): add contract tests ... (red)`: 10 de 11 tests fallaban (404, la ruta no existía).
2. Fase verde: commit `feat(A3): implement POST /api/video-tokens (green)`.
3. Refactor tras la revisión: commit `refactor(A3): use VideoSessionRepo and add concurrent-creation guard`: se quita `updateVideoSession` de `IncidentRepo`, se usa `VideoSessionRepo.update` y se añade el guard (CA-09).

## Pendientes

- `VideoService` usa el stub `InMemoryVideoService` hasta que A2 (#8) implemente Vonage real.
- Probar contra la BD real (`pnpm db:seed` + `curl`) cuando Docker esté levantado.
- El guard vive en memoria del proceso: con varias instancias haría falta un bloqueo en BD (post-MVP).
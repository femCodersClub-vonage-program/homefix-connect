# #38 · GET /api/incidents/:id alineado con el contrato — Validación

> Spec: [`02-specification.md`](./02-specification.md) · Plan: [`03-plan.md`](./03-plan.md) · Issue: #38

## Resultado de los tests

```text
$ pnpm test
 backend
 ✓ src/__tests__/app.test.ts (7 tests)
 Test Files  5 passed (5)
      Tests  55 passed (55)
 frontend
 Test Files  3 passed (3)
      Tests  15 passed (15)

$ pnpm check
 eslint + typecheck backend/frontend → sin errores
```

## Criterios de aceptación

| Criterio | Test (`app.test.ts`) | Resultado |
|---|---|---|
| La ruta pide a Prisma solo los campos del contrato (`select`, sin `include`) | `pide a Prisma solo los campos del contrato` | ✅ |
| CA-1 · 200 solo con los campos del schema `Incident` | `CA-1: devuelve 200 solo con los campos del contrato` | ✅ |
| CA-2 · No expone `phone`, `email`, `tenant`, `manager`, `*Id`, fechas ni `vonageSessionId` | `CA-2: no expone datos personales ni campos internos` | ✅ |
| CA-3 · `technician` y `visit` son `null` si no existen | `CA-3: technician y visit son null si no existen` | ✅ |
| CA-4 · 404 `{ error: 'Incident not found', id }` | `CA-4: devuelve 404 cuando no existe` | ✅ |

## Proceso TDD

1. Fase roja: commit `test(#38): add route contract tests (red)`: falla el test del `select` (la ruta usaba `include` con `tenant`, `manager` y relaciones enteras).
2. Fase verde: commit `fix(#38): select only contract fields in GET /incidents/:id (green)`.

## Decisiones aplicadas

- Q1: opción A (`select` de Prisma), la del issue.
- Q2: se mantiene el 404 actual `{ error, id }`.
- Q3: `openapi.yaml` sin cambios.

## Limitaciones y pendientes

- Con Prisma mockeado, lo que demuestra el filtrado es el test del `select`; los demás comprueban la forma de la respuesta.
- Pendiente: probar contra la BD real (`pnpm db:up` + seed + `curl http://localhost:<puerto>/api/incidents/inc_demo`) cuando Docker esté levantado.
- Si el equipo prefiere la opción B (repo + mapper), se cambia en este mismo PR.

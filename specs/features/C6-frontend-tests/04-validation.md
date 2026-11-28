# C6 · Validación de la especificación

> Branch: `test/C6-frontend` · Issue: [#22](https://github.com/femCodersClub-vonage-program/homefix-connect/issues/22) · Validado el 2026-11-26.

## 1. Resultado global

| Comprobación | Resultado |
|---|---|
| Issue #22 completado con la plantilla | PASS |
| Tests nuevos añadidos | 8 (`JoinButton` 4 + `client` 4) |
| `pnpm check` | PASS |
| `pnpm test` | PASS · backend 141/141 · frontend 62/62 |
| `pnpm build` | PASS con aviso conocido de chunks >500 kB |
| Cambios de producción | Ninguno |
| `openapi.yaml` / `schema.prisma` | No tocados |

## 2. Evidencia real de comandos

```text
$ pnpm --filter frontend test -- src/components/JoinButton.test.tsx src/api/client.test.ts
  Test Files  8 passed (8)
       Tests  62 passed (62)

$ pnpm check
  $ eslint .                         → sin errores
  $ pnpm -r typecheck                → backend Done · frontend Done

$ pnpm test
  backend  Test Files  12 passed (12) · Tests  141 passed (141)
  frontend Test Files   8 passed (8) · Tests   62 passed (62)

$ pnpm build
  backend build  → Done
  frontend build → ✓ built in 7.21s
  (!) Some chunks are larger than 500 kB after minification.
```

> Nota: el filtro pasado a Vitest no reducía la ejecución, por lo que la primera orden descubrió y validó directamente la suite completa con los 8 tests nuevos incluidos.

## 3. Trazabilidad de criterios de aceptación

| Criterio | Evidencia | Estado |
|---|---|---|
| `IncidentDetail`: render/loading/error/botón | `IncidentDetail.test.tsx` 22 tests + `JoinButton.test.tsx` 4 tests | PASS |
| `VideoCall`: init SDK, limpieza y estados | `VideoCall.test.tsx` 20 tests | PASS |
| `VideoCall` + remote: suscripción y desconexión | `VideoCall.test.tsx` (`streamCreated`, `streamDestroyed`, `sessionDisconnected`, `connectionDestroyed`) | PASS |
| Toast en `VIDEO_COMPLETED` | `IncidentDetail.test.tsx` + `FinishToast.test.tsx` 2 tests | PASS |
| `pnpm --filter frontend test` | 62/62 | PASS |

## 4. Decisiones aplicadas

- D-01: `vi.stubGlobal(fetch)` y `vi.mock` del SDK; sin MSW.
- D-02: no se creó `useVideoCall.test.tsx`; el hook queda cubierto por `VideoCall.test.tsx`.
- D-03: sin `@vitest/coverage-v8` ni umbral; evidencia = matriz + suite verde.
- D-04: no aparecieron bugs de producción; no hubo que abrir issue/fix aparte.

## 5. Alcance real entregado

- `[NEW]` `frontend/src/components/JoinButton.test.tsx`.
- `[NEW]` `frontend/src/api/client.test.ts`.
- `[NEW]` `specs/features/C6-frontend-tests/01-requirements.md`.
- `[NEW]` `specs/features/C6-frontend-tests/02-specification.md`.
- `[NEW]` `specs/features/C6-frontend-tests/issue-draft.md`.
- `[NEW]` `specs/features/C6-frontend-tests/03-plan.md`.
- `[NEW]` `specs/features/C6-frontend-tests/04-validation.md`.

No se modificó código de producción, configuración, contrato ni dependencias.

## 6. Pendiente para la entrega

- No se ha hecho commit, push ni PR: se espera autorización explícita.
- Si se abre PR, debe ser 1 issue = 1 rama = 1 PR con `Closes #22` y la plantilla `.github/pull_request_template.md`.

# 04 — Validation · C8 · Botón "Colgar" en `VideoCall`

> **Rama verificada:** `feat/C8-hangup-button` · **Fecha:** 2026-11-25
> **Issue:** [#57](https://github.com/femCodersClub-vonage-program/homefix-connect/issues/57)
> **Estado general:** PASSED técnicamente. Demo visual en navegador lista para ejecutar.

---

## 1. Resumen de Ejecución

C8 se implementó con TDD en la rama creada desde `origin/main` (`e820d70`, con
A4/B3/A5/B5 ya mergeados). El botón "Colgar" desconecta solo la sesión local,
deja la UI en "Desconectada" y no cambia el estado de la incidencia.

No se ha hecho commit, push ni PR. C5 (#51) sigue en su propia rama; por eso en
esta rama no aparece el toast "Visita finalizada".

---

## 2. Matriz de Criterios de Aceptación

| ID | Criterio de aceptación | Test que lo cubre | Estado | Evidencia |
|---|---|---|---|---|
| AC-01 | Botón "Colgar" visible y habilitado en `connected` | `VideoCall.test.tsx` · `muestra el botón "Colgar" habilitado cuando está conectada` | PASS | `getByRole('button', { name: 'Colgar' })` y `toBeEnabled()`. |
| AC-02 | Al colgar se desconecta y limpia el SDK | `VideoCall.test.tsx` · `al pulsar "Colgar" limpia la sesión y muestra "Desconectada"` | PASS | `off` de 4 eventos, `unsubscribe`, `unpublish`, `destroy` y `disconnect`. |
| AC-03 | Estado "Desconectada" y botón deshabilitado | Mismo test | PASS | Texto visible y `toBeDisabled()`. |
| AC-04 | Idempotencia | `VideoCall.test.tsx` · `no repite la limpieza si se pulsa dos veces o llega un evento tardío` | PASS | `disconnect` y `unpublish` se llaman una sola vez. |
| AC-05 | Sin transición de dominio | Mismo test de AC-02 | PASS | `fetchMock` sin llamadas; el hook no importa `api/` ni TanStack Query. |
| AC-06 | Ambas partes pueden colgar | Revisión de `VideoCallProps` y `useVideoCall` | PASS | No hay prop `role` ni comprobación de rol; el mismo botón sirve para cualquier token. |
| AC-07 | Suite aislada | `pnpm test` | PASS | SDK mockeado; sin cámara, red, Postgres ni Vonage real. |

---

## 3. Evidencia de Comandos

### Fase roja (antes de implementar)

```text
$ pnpm --filter frontend test -- src/components/VideoCall.test.tsx
→ Test Files  1 failed | 4 passed (5)
→ Tests       5 failed | 43 passed (48)
→ 5 tests fallan con "Unable to find an accessible element with the role 'button'
  and name 'Colgar'"
```

### Fase verde (tras implementar)

```text
$ pnpm --filter frontend test -- src/components/VideoCall.test.tsx
→ Test Files  5 passed (5)
→ Tests       48 passed (48)

$ pnpm check
→ $ pnpm lint && pnpm typecheck
→ $ eslint .
→ $ pnpm -r typecheck
→ frontend typecheck: Done
→ backend typecheck: Done

$ pnpm test
→ backend:  Test Files  12 passed (12)
→ backend:  Tests       141 passed (141)
→ frontend: Test Files  5 passed (5)
→ frontend: Tests       48 passed (48)

$ pnpm build
→ backend build: Done
→ frontend build: ✓ built in 3.70s
→ aviso conocido: chunks > 500 kB por el SDK de Vonage
```

### Servicios locales

```text
$ pnpm db:up && pnpm db:push && pnpm db:seed
→ homefix-db healthy
→ Seed OK · inc_demo VISIT_ASSIGNED · visit_demo CONFIRMED · vs_demo PENDING

$ curl -sS http://localhost:3000/api/health
→ {"status":"ok","timestamp":"2026-11-25T16:08:10.363Z"}

$ curl -sS -o /dev/null -w "%{http_code}" 'http://localhost:5173/?incidentId=inc_demo'
→ 200
```

---

## 4. Revisión de Regresiones

- Los 15 tests previos de `VideoCall.test.tsx` siguen pasando; se añadieron 5.
- `IncidentDetail.test.tsx` y `App.test.tsx` siguen en verde.
- Backend completo en verde: 141/141, sin cambios en esta rama.
- No se tocaron `backend/openapi.yaml`, `backend/prisma/schema.prisma`,
  `pnpm-lock.yaml` ni dependencias.
- No se introdujeron `console.log`, secretos ni teléfonos reales.
- El texto "Desconectada" y la limpieza de C4 se conservan; C8 solo añade una
  entrada explícita al mismo `cleanup()`.

---

## 5. Demo manual

- App levantada en `http://localhost:5173/?incidentId=inc_demo`.
- Backend en `:3000` con `/api/health` OK.
- Comprobación pendiente en navegador: pulsar "Colgar" durante una llamada y
  verificar que la UI queda en "Desconectada" y que la cámara se apaga.
- El aviso "Visita finalizada" pertenece a C5 (#51) y no está en esta rama;
  para verlo en la demo hace falta que #51 se mergee en `main`.

# 04 — Validation · C5 · Toast "Visita finalizada"

> **Issue:** [#21](https://github.com/femCodersClub-vonage-program/homefix-connect/issues/21)
> **Rama verificada:** `feat/C5-finish-toast` · **Fecha:** 2026-11-24
> **Base:** `02-specification.md` · `03-plan.md`

---

## 1. Resumen de Ejecución

**Estado general: PASSED (verificación automática).**

- TDD: fase roja confirmada con los tests nuevos fallando por falta de
  `FinishToast`, `useFinishToast` y `refetchInterval`; fase verde con 49/49 tests
  de frontend.
- `pnpm check`, `pnpm test` y `pnpm build` en verde desde la raíz.
- Demo manual en navegador: pendiente. El comportamiento observable del toast se
  verificó con Testing Library y temporizadores falsos, sin backend ni cámara
  reales.

---

## 2. Matriz de Criterios de Aceptación

| ID | Criterio | Test que lo cubre | Estado | Evidencia |
|---|---|---|---|---|
| AC-01 | Aviso en la transición | `IncidentDetail.test.tsx` · "muestra el toast cuando pasa a VIDEO_COMPLETED y lo oculta a los 5 s" | PASS | `setQueryData` cambia el estado a `VIDEO_COMPLETED`; aparece `role="status"` con el mensaje exacto. |
| AC-02 | Sin aviso en carga inicial | `IncidentDetail.test.tsx` · "no muestra el toast si la incidencia ya llega VIDEO_COMPLETED" | PASS | Botón "Visita realizada" deshabilitado y `queryByRole('status')` ausente. |
| AC-03 | Auto-dismiss | `IncidentDetail.test.tsx` · "muestra el toast cuando pasa a VIDEO_COMPLETED y lo oculta a los 5 s" | PASS | Tras `advanceTimersByTimeAsync(5000)` el aviso desaparece. |
| AC-04 | Sin duplicados | `IncidentDetail.test.tsx` · "no duplica el toast con actualizaciones repetidas en VIDEO_COMPLETED" | PASS | Dos actualizaciones seguidas dejan un solo `role="status"`. |
| AC-05 | Accesibilidad | `FinishToast.test.tsx` · "muestra el mensaje exacto con role status y aria-live polite" | PASS | `role="status"` y `aria-live="polite"`; texto exacto `FINISH_TOAST_MESSAGE`. |
| AC-06 | Botón intacto | `IncidentDetail.test.tsx` · "deshabilita el botón con 'Visita realizada' si la incidencia está VIDEO_COMPLETED" | PASS | El botón sigue deshabilitado; C5 no modifica `JoinButton`. |
| AC-07 | Polling | `IncidentDetail.test.tsx` · "vuelve a consultar la incidencia cada 5 s mientras no esté completada" | PASS | `fetchMock` pasa de 1 a 2 llamadas tras 5 s; se detiene al completar por `refetchInterval`. |
| AC-08 | Aislamiento | Toda la suite de C5 | PASS | `vi.stubGlobal('fetch', ...)`, mock de `VideoCall`, temporizadores falsos; sin red, cámara ni SDK real. |

---

## 3. Evidencia de Comandos

### Fase roja (antes de implementar)

Los tests nuevos fallaban porque aún no existían `FinishToast` ni
`useFinishToast`, y `useIncident` no tenía el polling de 5 s. Durante esta fase
también apareció un fallo de entorno local: 450 symlinks de
`node_modules/.pnpm/node_modules` apuntaban a la worktree temporal borrada de
C4 (`homefix-c4-merge`).

```text
Cannot find package 'vitest' imported from
node_modules/.pnpm/@testing-library+jest-dom@6.9.1/node_modules/@testing-library/jest-dom/dist/vitest.mjs
```

Corrección local, sin cambios en el repositorio:

```text
$ find node_modules/.pnpm/node_modules -type l -lname '*homefix-c4-merge*' -delete
$ pnpm install --offline --frozen-lockfile --force
```

### Fase verde

```text
$ pnpm --filter frontend test
✓ src/api/types.test.ts (4 tests)
✓ src/api/video.test.ts (3 tests)
✓ src/components/FinishToast.test.tsx (2 tests)
✓ src/components/VideoCall.test.tsx (15 tests)
✓ src/pages/IncidentDetail.test.tsx (22 tests)
✓ src/App.test.tsx (3 tests)

Test Files  6 passed (6)
Tests       49 passed (49)
```

```text
$ pnpm check
$ pnpm lint && pnpm typecheck
$ eslint .
$ pnpm -r typecheck
frontend typecheck: Done
backend typecheck: Done
```

```text
$ pnpm test
backend  Test Files  9 passed (9) · Tests  100 passed (100)
frontend Test Files  6 passed (6) · Tests  49 passed (49)
Done
```

```text
$ pnpm build
backend build: Done
frontend build: ✓ 93 modules transformed.
frontend build: ✓ built in 6.05s
```

`pnpm build` emite el aviso ya conocido de chunks > 500 kB por el SDK de Vonage;
no es un error ni un cambio introducido por C5.

---

## 4. Revisión de Regresiones

- C1–C4 siguen verdes: API client, detalle de incidencia, init de vídeo y
  streaming remoto no han cambiado su contrato.
- `IncidentDetail.test.tsx` pasa de 18 a 22 tests; los 18 anteriores siguen
  igual, solo se añade el bloque "aviso de fin de visita".
- `JoinButton` no se modifica: el botón sigue deshabilitado en
  `VIDEO_COMPLETED`.
- No se añadieron dependencias ni se tocó `pnpm-lock.yaml`.
- No se modificaron `backend/openapi.yaml`, `backend/prisma/schema.prisma` ni
  código backend.
- El único cambio de API interna es el nuevo hook `useFinishToast` y el
  `refetchInterval` de `useIncident`, consumidos solo por `IncidentDetail`.

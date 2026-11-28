# 01 — Requirements · C6 · Tests frontend

> **Estado:** análisis y decisiones acordadas el 2026-11-25; pendiente de aprobación del plan. **No tocar código hasta aprobación explícita.**

---

## 1. Resumen del problema

El carril frontend (C2–C5, más C8 ya mergeado) tiene tests que acompañaron cada entrega, pero C6 debe cerrar el carril con una suite deliberada y trazable: cada criterion del issue #22 tiene un test que lo demuestra y la suite completa pasa sin abrir cámara, red real ni Postgres.

Valor observable: una persona del equipo puede ejecutar `pnpm --filter frontend test` y ver, sin configurar nada, que la pantalla de incidencia, la videollamada, el vídeo remoto, el botón de colgar y el toast están protegidos contra regresiones.

---

## 2. Casos de uso afectados

- `docs/MVP_DEFINITION.md` escenarios 1–4: consultar incidencia, entrar a la videollamada, ver vídeo remoto y recibir el aviso al finalizar.
- `docs/TASKS.md:118` · C6, size S, blocked by C2, C3, C4, C5.
- `docs/TASKS.md:124` · I1 queda liberado por C6.

---

## 3. Comportamiento actual vs esperado

### Actual

- Hay 6 archivos de test y **54 tests en verde**:
  - `src/App.test.tsx` (3)
  - `src/api/types.test.ts` (4)
  - `src/api/video.test.ts` (3)
  - `src/components/FinishToast.test.tsx` (2)
  - `src/components/VideoCall.test.tsx` (20)
  - `src/pages/IncidentDetail.test.tsx` (22)
- Los tests existentes ya cubren, a nivel de componente:
  - `IncidentDetail`: render, loading, 404, error, roles, estados del botón, flujo de token, error 403/404/409/500, polling y toast.
  - `VideoCall`: init, publish, stream remoto, cleanup, errores de connect/publish/subscribe y botón "Colgar".
  - `FinishToast`: mensaje, `role="status"`, `aria-live="polite"` y ocultado.
- Mock strategy actual: `vi.stubGlobal('fetch', ...)` para API y `vi.mock('@vonage/client-sdk-video', ...)` por archivo; `renderHook` **no** se usa todavía.
- No hay reporte de cobertura ni umbral configurado.

### Esperado

- Cada AC del issue #22 mapeado a uno o más tests con nombre descriptivo.
- Cobertura explícita de los huecos que se decidan en clarificación (por ejemplo, hook por separado, errores de red, limpieza al desmontar).
- Sin dependencias nuevas y sin cambiar comportamiento de producción salvo que aparezca un bug que se trate en su propio issue/PR.
- `pnpm --filter frontend test` en verde y `pnpm check` sin errores.

---

## 4. Clasificación de requisitos

| Tipo | Requisito | Origen |
|---|---|---|
| Explícito | `IncidentDetail`: render, loading, error, botón habilitado/deshabilitado según estado | Issue #22 |
| Explícito | `VideoCall`: init SDK, cleanup al desmontar, estado visual | Issue #22 |
| Explícito | `VideoCall` + remote: suscripción a stream remoto, desconexión | Issue #22 |
| Explícito | Toast: aparece al detectar `VIDEO_COMPLETED` | Issue #22 |
| Explícito | `pnpm --filter frontend test` pasa | Issue #22 |
| Derivado | Sin cámara, red ni Vonage reales en tests | `frontend/AGENTS.md` §5 y §7 |
| Derivado | Consultas por rol/texto visible; sin snapshots ni `querySelector` | `frontend/AGENTS.md` §7 |
| Derivado | Sin librerías nuevas; el stack está fijado | `AGENTS.md` §2.13 |
| Desconocido | Estrategia de mock: ¿mantener `vi.stubGlobal`/`vi.mock` o añadir MSW? | Decisión pendiente del issue |
| Desconocido | ¿Testear `useVideoCall` por separado del componente? | Decisión pendiente del issue |
| Desconocido | ¿Añadir reporte/umbral de cobertura? | El issue dice "Cobertura: test pasa", no percentage |
| Desconocido | Si aparece un bug, ¿se arregla aquí o se abre issue aparte? | Regla 1 issue = 1 PR |

---

## 5. Fuera de alcance (Out of scope)

- Tests E2E con Playwright/ngrok (I1).
- Contract tests, integración con Postgres ni llamadas reales a Vonage.
- Cambios en `backend/openapi.yaml`, `schema.prisma`, dependencias o `vite.config.ts`.
- Añadir librerías de estado global, UI o testing nuevas.
- Refactors de producción oportunistas; solo se toca código si un test descubre un bug y se decide así.
- Repetir tests que ya cubren exactamente el mismo comportamiento solo por aumentar el número.

---

## 6. Dependencias

- **Hard:** C2 (#18, PR #39), C3 (#19, PR #42), C4 (#20, PR #45), C5 (#21, PR #51), todos mergeados en `main`.
- **Relacionado:** C8 (#57, PR #58) también mergeado; su botón "Colgar" ya tiene 5 tests y debe conservarse.
- **Soft:** ninguna. Se puede trabajar con mocks desde `main`.

---

## 7. Mapa de código y tests

| Pieza | Producción | Tests actuales |
|---|---|---|
| Pantalla de incidencia | `src/pages/IncidentDetail.tsx`, `src/hooks/useIncident.ts` | `src/pages/IncidentDetail.test.tsx` |
| Acceso API | `src/api/client.ts`, `src/api/incidents.ts`, `src/api/video.ts` | `src/api/types.test.ts`, `src/api/video.test.ts` |
| Videollamada local/remota | `src/components/VideoCall.tsx`, `src/hooks/useVideoCall.ts`, `src/hooks/useVideoToken.ts` | `src/components/VideoCall.test.tsx` |
| Aviso final | `src/components/FinishToast.tsx`, `src/hooks/useFinishToast.ts` | `src/components/FinishToast.test.tsx`, `IncidentDetail.test.tsx` |
| Entrada | `src/App.tsx` | `src/App.test.tsx` |
| Setup | `src/test/setup.ts`, `src/test/fixtures/incident.ts`, `vite.config.ts` | — |

---

## 8. Decisiones de clarificación acordadas

| ID | Decisión | Consecuencia |
|---|---|---|
| D-01 | Mantener `vi.stubGlobal(fetch)` y `vi.mock` del SDK | Sin MSW ni dependencias nuevas; se respeta el stack fijado. |
| D-02 | No crear `useVideoCall.test.tsx` con `renderHook` | El hook se cubre a través de `VideoCall`, donde se observa el estado visual y la limpieza; se evita duplicar escenarios. |
| D-03 | Sin reporte ni umbral de cobertura | La evidencia es la matriz AC→test y `pnpm --filter frontend test` en verde; no se añade `@vitest/coverage-v8`. |
| D-04 | Un bug detectado se abre en issue/fix aparte | C6 sigue siendo un PR solo de tests y respeta 1 issue = 1 rama = 1 PR. |

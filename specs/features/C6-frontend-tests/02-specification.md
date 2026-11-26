# C6 · Especificación técnica — Tests frontend

> **Estado:** spec cerrada; pendiente de aprobación del plan. Issue [#22](https://github.com/femCodersClub-vonage-program/homefix-connect/issues/22). **No tocar código hasta aprobación explícita.**

## 1. Contexto

El carril frontend C2–C5 ya está mergeado en `main` junto con C8. Las pruebas actuales cubren los criterios de aceptación de esos issues, pero dos piezas se validan solo de forma indirecta: `JoinButton` (C2) y el transporte `getJson`/`postJson` (C1/C3). C6 formaliza la cobertura existente y añade tests directos de esas piezas, sin cambiar comportamiento de producción.

## 2. Alcance

- Incluye:
  - Tests unitarios directos de `JoinButton` para estados y disabled de la UI.
  - Tests unitarios directos de `api/client.ts` para cabeceras, body y `HttpError`.
  - Matriz AC → test que deje trazabilidad del carril C2–C5 (+ C8).
  - Evidencia local de `pnpm check`, `pnpm test` y `pnpm build`.
- Fuera de alcance:
  - Cambios de producción en componentes, hooks o transporte.
  - Tests E2E/Playwright y contract tests (I1 y equipo).
  - Cobertura con `@vitest/coverage-v8` o umbrales.
  - Correcciones de bugs de producción detectados durante la tarea (D-04).

## 3. Supuestos y decisiones de refinamiento

| ID | Decisión | Consecuencia |
|---|---|---|
| D-01 | Mantener `vi.stubGlobal(fetch)` y `vi.mock` del SDK | Sin MSW ni dependencias nuevas. |
| D-02 | No crear `useVideoCall.test.tsx` con `renderHook` | `useVideoCall` se cubre a través de `VideoCall`. |
| D-03 | Sin reporte ni umbral de cobertura | Evidencia = matriz AC→test + suite verde. |
| D-04 | Bug detectado → issue/fix aparte | C6 sigue siendo 1 rama = 1 PR de solo tests. |

## 4. Caso de uso y criterio de aceptación

**Caso de uso (fijo):** CU-07 · Verificación automatizada del carril frontend (C2–C5).

**Criterio de aceptación (fijo):**

- [ ] `IncidentDetail`: render con datos, estado de carga, errores y botón habilitado/deshabilitado según estado.
- [ ] `VideoCall`: inicialización del SDK, limpieza de recursos y estados visibles.
- [ ] `VideoCall`: suscripción al vídeo remoto y desconexión sin dejar UI colgada.
- [ ] `Toast`: aparece al detectar transición a `VIDEO_COMPLETED`.
- [ ] Cobertura: `pnpm --filter frontend test` pasa.

## 5. Contrato de entrada (para los tests)

- `fetch` se sustituye con `vi.stubGlobal('fetch', vi.fn())`.
- SDK de Vonage se sustituye con `vi.mock('@vonage/client-sdk-video', ...)` usando el mock existente de `VideoCall.test.tsx`.
- Timers del toast se controlan con `vi.useFakeTimers()` y se restauran en `afterEach`.
- No se abre cámara, no se llama a red y no se usa Postgres.

## 6. Contrato de salida

- Resultado observable: comandos de test/check/build en verde y matriz AC→test completa.
- Ningún cambio de API HTTP ni de tipos generados.
- `backend/openapi.yaml` y `backend/prisma/schema.prisma` no se tocan.

## 7. Reglas de negocio que se validan

- `JoinButton` solo se habilita si `incidentStatus === 'VISIT_ASSIGNED'` y `visitStatus === 'CONFIRMED'`.
- Con `isConnecting: true`, el botón muestra `Conectando…`, queda deshabilitado y no dispara `onClick`.
- `VIDEO_COMPLETED` muestra `Visita realizada` y deshabilita el botón.
- `getJson` y `postJson` conservan `Accept: application/json`; `postJson` añade `Content-Type: application/json` y serializa el body.
- Los errores HTTP se convierten en `HttpError` con `status` y mensaje `MÉTODO path respondió STATUS`.

## 8. Errores

No se añaden códigos nuevos. Los tests existentes cubren `403`, `404`, `409` y `500` en el flujo de token; C6 añade cobertura directa del mapeo en `HttpError`. No se implementan nuevos manejadores.

## 9. Casos límite

- Incidencia con `visit: null` → botón deshabilitado.
- Visita `CANCELLED` o incidencia `REPORTED`/`CLOSED` → botón deshabilitado.
- `onClick` ausente en `JoinButton` → el botón sigue renderizando sin fallar.
- `fetch` rechazado por red → se propaga el error original (ya cubierto en `api/video.test.ts`).

## 10. Especificación por escenarios

### RF-01 · JoinButton habilitado

**Given** `incidentStatus = VISIT_ASSIGNED` y `visitStatus = CONFIRMED`; **When** se renderiza `JoinButton`; **Then** se muestra `Entrar a la videollamada` habilitado.

### RF-02 · JoinButton tras visita realizada

**Given** `incidentStatus = VIDEO_COMPLETED`; **When** se renderiza; **Then** se muestra `Visita realizada` deshabilitado.

### RF-03 · JoinButton no disponible

**Given** estados `REPORTED`/`CLOSED`, visita no confirmada o sin visita; **When** se renderiza; **Then** se muestra `Videollamada no disponible` deshabilitado.

### RF-04 · JoinButton conectando

**Given** `canJoin = true` y `isConnecting = true`; **When** se hace clic; **Then** muestra `Conectando…`, está deshabilitado y `onClick` no se llama.

### RF-05 · getJson

**Given** un `fetch` mockeado con respuesta JSON; **When** se llama `getJson('/api/incidents/inc_demo', { headers: { 'X-User-Role': 'TENANT' } })`; **Then** `fetch` recibe `Accept`, la cabecera de rol y la función devuelve el JSON.

### RF-06 · getJson error

**Given** respuesta `ok: false`, `status: 404`; **When** se llama `getJson`; **Then** lanza `HttpError` con `status: 404` y mensaje `GET /api/incidents/inc_demo respondió 404`.

### RF-07 · postJson

**Given** un `fetch` mockeado con respuesta JSON; **When** se llama `postJson('/api/video-tokens', { incidentId: 'inc_demo' }, { headers: { 'X-User-Role': 'TENANT' } })`; **Then** `fetch` recibe `Accept`, `Content-Type`, la cabecera de rol y el body serializado.

### RF-08 · postJson error

**Given** respuesta `ok: false`, `status: 409`; **When** se llama `postJson`; **Then** lanza `HttpError` con `status: 409` y mensaje `POST /api/video-tokens respondió 409`.

## 11. Requisitos no funcionales

- TypeScript estricto: sin `any` implícito; los mocks se tipan con los tipos existentes del SDK.
- Sin snapshots y sin `container.querySelector`; consultas por rol/texto visible.
- Ninguna dependencia nueva y ningún cambio en `vite.config.ts`.
- Tests deterministas: limpieza de mocks/timers en `afterEach`.

## 12. Datos de prueba

- Fixtures: `frontend/src/test/fixtures/incident.ts`.
- IDs simulados: `inc_demo`, `sess_demo`, `app_demo`, `token_demo`.
- Roles: `TENANT`, `TECHNICIAN`.
- Estados de incidencia: `REPORTED`, `VISIT_ASSIGNED`, `VIDEO_COMPLETED`, `CLOSED`.
- Estados de visita: `PENDING`, `CONFIRMED`, `COMPLETED`, `CANCELLED`.
- Sin teléfonos reales, tokens reales ni secretos.

## 13. Matriz de trazabilidad

| AC | Evidencia existente | Evidencia nueva C6 |
|---|---|---|
| Render/loading/error/botón | `IncidentDetail.test.tsx` | `JoinButton.test.tsx` |
| SDK + limpieza + estados | `VideoCall.test.tsx` | — |
| Stream remoto + desconexión | `VideoCall.test.tsx` | — |
| Toast en `VIDEO_COMPLETED` | `IncidentDetail.test.tsx`, `FinishToast.test.tsx` | — |
| Suite en verde | 54 tests actuales | +8 tests (`JoinButton` + `client`) |

## 14. Fuera de alcance y riesgos

- No se toca código de producción; riesgo principal es que un test nuevo encodee un comportamiento accidental. Mitigación: las expectativas salen de la UI visible y del contrato existente, no de detalles internos.
- Si un test falla contra el código actual, se aplica D-04: issue/fix aparte, no parche dentro de C6.
- No se actualiza `openapi.yaml` ni `schema.prisma`; no aplica `db:push`/`db:seed`.

# C6 · Plan técnico — Tests frontend

> **Estado:** propuesto. **Punto de parada obligatorio:** no crear rama ni tocar código hasta aprobación explícita del usuario.

## 1. Desglose de ficheros afectados

- `[NEW]` `frontend/src/components/JoinButton.test.tsx`: 4 tests directos del botón de entrada a la videollamada (RF-01..RF-04). Consulta por rol/texto visible; sin snapshots.
- `[NEW]` `frontend/src/api/client.test.ts`: 4 tests directos de `getJson`/`postJson` (RF-05..RF-08) con `fetch` mockeado y `HttpError`.
- `[MODIFY]` Ningún archivo de producción.
- `[DELETE]` Ninguno.
- `[NEW]` `specs/features/C6-frontend-tests/04-validation.md`: evidencia real de check/test/build tras la implementación.

## 2. Cambios en contratos y base de datos

- No se modifica `backend/openapi.yaml` ni `backend/prisma/schema.prisma`. No aplica aviso de contrato ni `pnpm db:push`/`db:seed`.
- No se regeneran tipos (`pnpm gen:types`) porque no cambia el contrato.
- No se añaden dependencias; se usan Vitest y Testing Library ya instalados.

## 3. Estrategia de pruebas (TDD adaptado a un PR solo de tests)

- **Fase roja:** escribir primero los 8 tests nuevos y ejecutar `pnpm --filter frontend test -- <archivo>`. Como el comportamiento ya existe en producción, la "roja" se considera detectada si el test nuevo no se descubre o si falla por una expectativa incorrecta; no se simula un fallo artificial. Cualquier fallo real se documenta y se deriva a issue/fix aparte (D-04).
- **Fase verde:** no hay código de producción que escribir. Verde = los 8 tests nuevos pasan y la suite completa sigue en verde (54 → 62 tests).
- **Mocks y dobles:** `vi.stubGlobal('fetch', vi.fn())` en `client.test.ts`; `JoinButton.test.tsx` no necesita mocks de red ni SDK. El mock del SDK en `VideoCall.test.tsx` permanece intacto.
- **Limpieza:** `vi.unstubAllGlobals()` en `afterEach` donde aplique; sin timers nuevos en `JoinButton.test.tsx`.

## 4. Orden secuencial de ejecución

1. Tras aprobación, crear rama `test/C6-frontend` desde `main` (`fae42c1` o la última punta actualizada).
2. Añadir `JoinButton.test.tsx` con RF-01..RF-04 y ejecutar el fichero de forma aislada.
3. Añadir `client.test.ts` con RF-05..RF-08 y ejecutar el fichero de forma aislada.
4. Ejecutar `pnpm --filter frontend test`; confirmar 62/62 y sin regresiones en `VideoCall`/`IncidentDetail`.
5. Ejecutar `pnpm check`, `pnpm test` y `pnpm build` desde la raíz; capturar salida real.
6. Completar `04-validation.md` y dejar el cambio listo para revisión. No hacer commit/push/PR sin autorización explícita.

## 5. Riesgos técnicos y mitigaciones

- **Duplicar tests existentes:** mitigado cubriendo solo piezas sin test directo (`JoinButton`, `client.ts`) y documentando el resto en la matriz.
- **Tests acoplados a detalles internos:** mitigado con consultas por rol/texto visible y aserciones sobre la llamada a `fetch`, no sobre estado interno de React Query.
- **Ruido por mocks globales:** mitigado con `vi.unstubAllGlobals()` en `afterEach`.
- **Bug de producción descubierto:** mitigado con D-04; C6 no mezcla correcciones.
- **Regresión en C8:** mitigado ejecutando la suite completa de frontend, incluidos los tests de "Colgar".

## 6. Matriz de trazabilidad

| RF / AC | Archivo | Test |
|---|---|---|
| RF-01 · AC botón | `frontend/src/components/JoinButton.test.tsx` | habilita con `VISIT_ASSIGNED` + `CONFIRMED` |
| RF-02 · AC botón | `frontend/src/components/JoinButton.test.tsx` | `VIDEO_COMPLETED` → `Visita realizada` deshabilitado |
| RF-03 · AC botón | `frontend/src/components/JoinButton.test.tsx` | estados no disponibles y sin visita |
| RF-04 · AC botón | `frontend/src/components/JoinButton.test.tsx` | conectando deshabilita y no llama `onClick` |
| RF-05 · AC suite | `frontend/src/api/client.test.ts` | `getJson` envía `Accept`/cabeceras y devuelve JSON |
| RF-06 · AC errores | `frontend/src/api/client.test.ts` | `getJson` 404 → `HttpError` |
| RF-07 · AC suite | `frontend/src/api/client.test.ts` | `postJson` envía `Content-Type`, body y cabeceras |
| RF-08 · AC errores | `frontend/src/api/client.test.ts` | `postJson` 409 → `HttpError` |
| AC SDK/limpieza | `frontend/src/components/VideoCall.test.tsx` | existentes 20 tests |
| AC stream remoto | `frontend/src/components/VideoCall.test.tsx` | existentes `streamCreated`/`streamDestroyed` |
| AC toast | `frontend/src/pages/IncidentDetail.test.tsx`, `frontend/src/components/FinishToast.test.tsx` | existentes transición y 5 s |
| AC render/loading/error | `frontend/src/pages/IncidentDetail.test.tsx` | existentes 22 tests |

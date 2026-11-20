# 03 — Plan · C3 · VideoCall: init SDK + vídeo local + cleanup

> **Issue:** [#19](https://github.com/femCodersClub-vonage-program/homefix-connect/issues/19)
> **Rama:** `feat/C3-video-call-init` · **Size:** M
> **Base:** `02-specification.md` · **Estado:** ejecutado en la rama; validación
> en `04-validation.md`.

---

## 1. Ficheros Afectados

### Nuevos

- `[NEW] frontend/src/api/video.ts` — Alias de `VideoTokenRequest`/
  `VideoTokenResponse` y `requestVideoToken(incidentId, role)`.
- `[NEW] frontend/src/hooks/useVideoToken.ts` — `useMutation` sin retry para el
  token.
- `[NEW] frontend/src/hooks/useVideoCall.ts` — Ciclo de vida del SDK: init,
  connect, publisher, listeners, cleanup idempotente y estados.
- `[NEW] frontend/src/components/VideoCall.tsx` — Render del stage, vídeo local y
  estado accesible.
- `[NEW] frontend/src/api/video.test.ts` — Contrato HTTP de `requestVideoToken`.
- `[NEW] frontend/src/components/VideoCall.test.tsx` — SDK mockeado; init,
  connect, publish, eventos, errores y cleanup.

### Modificados

- `[MODIFY] frontend/src/api/client.ts` — Añadir `postJson` con JSON y
  `HttpError`; conservar `getJson`.
- `[MODIFY] frontend/src/api/incidents.ts` — Extraer y exportar `userHeaders(role)`;
  `getIncident` lo usa sin cambiar comportamiento.
- `[MODIFY] frontend/src/components/JoinButton.tsx` — Prop opcional
  `isConnecting`; label "Conectando…" y disabled mientras se pide el token.
- `[MODIFY] frontend/src/pages/IncidentDetail.tsx` — `useVideoToken`, cableado
  del botón, mensajes de error, bloqueo del selector y montaje de `VideoCall`.
- `[MODIFY] frontend/src/pages/IncidentDetail.test.tsx` — Mock de `VideoCall` y
  casos de token (éxito, pending, 403, 409, 500/red, rol técnico, bloqueo).
- `[MODIFY] frontend/src/api/types.test.ts` — Test de tipo de
  `VideoTokenResponse` contra el schema generado.
- `[MODIFY] frontend/src/index.css` — `.video-call`, `.video-call__stage`,
  `.video-call__local` y estados.
- `[MODIFY] frontend/package.json` — `@vonage/client-sdk-video` `2.36.0` exacto
  en `dependencies`.
- `[MODIFY] pnpm-lock.yaml` — Resolución del SDK.
- `[MODIFY] frontend/AGENTS.md` — Actualizar el mapa de carpetas con
  `api/video.ts`, `hooks/useVideoCall.ts`, `hooks/useVideoToken.ts` y
  `components/VideoCall.tsx`.

### Sin cambios

- `backend/openapi.yaml`, `backend/prisma/schema.prisma`, `backend/*`.
- `frontend/vite.config.ts`, `frontend/src/main.tsx`.
- Rutas, proxy, router y configuración de tests.

---

## 2. Contratos y Base de Datos

- **Sin cambios de contrato ni de BD.** `VideoTokenRequest`/
  `VideoTokenResponse` ya existen en el schema generado.
- No se ejecuta `pnpm gen:types`.
- La única dependencia nueva es el SDK Web de Vonage, ya previsto en el stack de
  `frontend/AGENTS.md`.
- `pnpm-lock.yaml` cambia; coordinar con #40 (A2), que también lo toca. Orden
  recomendado: mergear #40 antes de instalar C3 o rebasar C3 justo antes de
  `pnpm install`.

---

## 3. Estrategia TDD

### Fase roja

1. `frontend/src/api/video.test.ts`:
   - POST correcto con body/cabeceras.
   - 409 → `HttpError`.
   - error de red.
2. `frontend/src/components/VideoCall.test.tsx`:
   - init/connect/publish.
   - estados.
   - eventos de desconexión.
   - errores.
   - cleanup.
3. `frontend/src/pages/IncidentDetail.test.tsx`:
   - click → token.
   - pending.
   - 200 → `VideoCall`.
   - 403/409/500.
   - rol técnico.
   - selector bloqueado.
4. `frontend/src/api/types.test.ts`:
   - `VideoTokenResponse` es el schema generado.

Ejecutar `pnpm --filter frontend test` y comprobar que falla por módulos/comportamiento
inexistente, no por un error de entorno.

### Fase verde

Implementar en este orden:

1. `client.ts`: `postJson`.
2. `incidents.ts`: `userHeaders`.
3. `video.ts`: `requestVideoToken`.
4. `useVideoToken`.
5. `useVideoCall`.
6. `VideoCall`.
7. `JoinButton` + `IncidentDetail`.
8. `index.css` y `frontend/AGENTS.md`.

### Mocks y dobles

- `fetch` con `vi.stubGlobal`; sin red.
- `@vonage/client-sdk-video` con `vi.mock`; sin cámara ni `mediaDevices`.
- `VideoCall` mockeado en `IncidentDetail.test.tsx` para aislar la página.
- `QueryClient` con `retry: false`.
- Sin Postgres.

---

## 4. Orden Secuencial de Ejecución

1. **Preparar rama y lockfile:** confirmar que #40 está mergeado o rebasar C3;
   después `pnpm --filter frontend add @vonage/client-sdk-video@2.36.0
   --save-exact`.
2. **Rojo de API:** escribir `video.test.ts`; ver fallar.
3. **Verde de API:** `postJson`, `userHeaders`, `video.ts`; test verde.
4. **Rojo del SDK:** escribir `VideoCall.test.tsx` con mocks; ver fallar.
5. **Verde del SDK:** `useVideoCall` y `VideoCall`; test verde.
6. **Rojo de página:** ampliar `IncidentDetail.test.tsx`; ver fallar.
7. **Verde de página:** `useVideoToken`, `JoinButton`, `IncidentDetail`; test
   verde.
8. **Tipos y estilos:** `types.test.ts`, `index.css`, `frontend/AGENTS.md`.
9. **Verificación:** `pnpm --filter frontend test`, `pnpm check`, `pnpm test`,
   `pnpm build`.
10. **Demo manual:** backend + Postgres + seed + credenciales reales; abrir
    inquilina y técnica, comprobar mismo `sessionId`, vídeo local y apagado de
    cámara al desmontar/recargar.

---

## 5. Riesgos Técnicos y Mitigaciones

- **Conflicto de lockfile con #40:** rebasar/mergear #40 antes de instalar; no
  tocar el lockfile en commits de docs.
- **StrictMode en desarrollo:** React ejecuta setup → cleanup → setup. La
  bandera `cancelled` y el cleanup idempotente deben evitar dos cámaras o
  callbacks tardíos. Probar el hook/componente también bajo `StrictMode` o
  validar manualmente en `pnpm dev`.
- **Tipos `export = OT`:** comprobar `tsc` con `esModuleInterop`; si el default
  import falla, usar `import * as OT` o la forma que acepte el paquete, sin
  `any`.
- **SDK en jsdom:** no importar rutas que ejecuten `navigator.mediaDevices` en
  tests; el mock debe cubrir `initSession` e `initPublisher`.
- **Callback después del unmount:** comprobar `cancelled`; destruir publisher si
  se creó después del cleanup.
- **Doble cleanup:** `cleaned` evita dobles `unpublish`/`destroy`/`disconnect`.
- **Error convertido en `ended`:** quitar listeners antes de `disconnect` para
  que un fallo no se sobrescriba con `ended`.
- **Permiso de cámara denegado:** `initPublisher` callback → `error`; no dejar
  la UI en `connecting`.
- **Sin botón de colgar:** el cleanup se valida desmontando/recargando; el
  control explícito de fin de llamada queda para C4/I2.
- **Token en logs:** prohibido; no se imprime `applicationId`+`sessionId`+`token`
  juntos.

---

## 6. Matriz de Trazabilidad

| AC (02-specification) | Archivo / test |
|---|---|
| 1. Entrada correcta + token | `IncidentDetail.test.tsx` · click/post/headers/body |
| 2. Estado de espera | `IncidentDetail.test.tsx` · promesa pendiente + "Conectando…" |
| 3. Init del SDK | `VideoCall.test.tsx` · `initSession` + `connect` |
| 4. Publicación local | `VideoCall.test.tsx` · `initPublisher` + `publish` + "Conectada" |
| 5. Fin de sesión | `VideoCall.test.tsx` · handlers `sessionDisconnected`/`connectionDestroyed` |
| 6. Error de conexión | `VideoCall.test.tsx` · callback de error |
| 7. Cleanup al desmontar | `VideoCall.test.tsx` · `unmount` + spies |
| 8. Error 409 | `IncidentDetail.test.tsx` · `HttpError` 409 |
| 9. Error 403 | `IncidentDetail.test.tsx` · `HttpError` 403 |
| 10. Error de red | `IncidentDetail.test.tsx` · `fetch` rechaza |
| 11. Rol técnico | `IncidentDetail.test.tsx` · cabeceras/body con TECHNICIAN |
| 12. Sin cámara en tests | `VideoCall.test.tsx` · `vi.mock` del SDK |
| Contrato HTTP | `video.test.ts` · `postJson`/`requestVideoToken` |
| Tipo del contrato | `types.test.ts` · `VideoTokenResponse` |

---

## 7. Verificación Final

```bash
pnpm --filter frontend test
pnpm --filter frontend typecheck
pnpm check
pnpm test
pnpm build
```

Demo manual:

```bash
pnpm db:up
pnpm db:seed
pnpm dev
```

- Abrir `http://localhost:5173/?incidentId=inc_demo`.
- Probar `TENANT` y `TECHNICIAN`.
- Verificar que el `sessionId` es el mismo para ambos roles.
- Verificar vídeo local y que la cámara se apaga al desmontar/recargar.
- Adjuntar evidencia real en `04-validation.md` antes del PR.

---

## 8. Fuera de este Plan

- `04-validation.md` se escribe después de implementar y ejecutar las pruebas.
- No se abre PR, no se hace commit ni se actualiza el issue sin autorización
  explícita.
- No se toca #40/#41 ni sus ramas.

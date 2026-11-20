# 01 — Requirements · C3 · VideoCall: init SDK + vídeo local + cleanup

> **Issue:** [#19](https://github.com/femCodersClub-vonage-program/homefix-connect/issues/19)
> **Rama:** `feat/C3-video-call-init` · **Size:** M
> **Fuente de alcance:** `docs/MVP_DEFINITION.md` · `docs/TASKS.md` §7 ·
> `frontend/AGENTS.md` §5 · `backend/openapi.yaml`
> **Estado:** requisitos cerrados el 2026-11-20. Pendiente de aprobar el plan
> técnico (`03-plan.md`) antes de implementar.

---

## 1. Resumen del Problema

La incidencia ya se puede consultar y el botón "Entrar a la videollamada" ya
existe, pero todavía no hace nada. C3 conecta ese botón con el SDK Web de Vonage,
pide un token real al backend, publica cámara y micrófono y garantiza que la
cámara se apaga al desmontar.

**Valor observable:** la inquilina o la técnica pueden entrar a la sesión de
Vonage y verse en local, sin dejar la cámara encendida al salir de la pantalla.

**Consumidores:** inquilina (`TENANT`) y técnica (`TECHNICIAN`). La gestora no
entra a la videollamada en el MVP.

---

## 2. Casos de Uso Afectados

Referencia: `docs/MVP_DEFINITION.md`.

| Escenario | Relación con C3 |
|---|---|
| **1 — Inquilina entra a la videollamada** | Pide el token, inicializa la sesión y publica su cámara/micrófono. |
| **2 — Técnica entra a la videollamada** | Mismo flujo con `X-User-Role: TECHNICIAN` y su `X-User-Id`. |
| **3 — Fin de la videollamada → SMS** | C3 no envía SMS ni cierra la sesión en backend; deja el estado visual `ended` y limpia recursos locales. A4/C5/C6 cubren el resto. |
| **4 — Frontend notifica fin de visita** | C3 no muestra el toast; solo refleja `ended`/`error` dentro del componente. C5 añade el toast. |

**Precondición del MVP:** incidencia `VISIT_ASSIGNED`, visita `CONFIRMED` y
sesión de vídeo `PENDING`/`ACTIVE`, tal como queda en el seed.

---

## 3. Comportamiento Actual vs Esperado

### Hoy

- `JoinButton` acepta `onClick`, pero `IncidentDetail` no le pasa ninguna función.
- `frontend/src/api/client.ts` solo tiene `getJson`; no hay forma de hacer
  `POST /api/video-tokens`.
- No existe ninguna dependencia del SDK Web de Vonage en `frontend/package.json`.
- No existe `VideoCall`, ni hook de ciclo de vida del SDK, ni tests del SDK.
- `POST /api/video-tokens` ya existe en el backend y devuelve
  `{ applicationId, sessionId, token }`.

### Esperado tras C3

- Al pulsar "Entrar a la videollamada" se pide el token real a
  `POST /api/video-tokens`.
- Mientras se pide, el botón queda deshabilitado y muestra "Conectando…".
- Con la respuesta, se monta `VideoCall` con `applicationId`, `sessionId` y
  `token`.
- `VideoCall` inicializa `OT.initSession(applicationId, sessionId)`, conecta con
  el token, publica audio + vídeo local y muestra el vídeo local.
- Estado visual explícito: `idle | connecting | connected | error | ended`.
- Al desmontar, se hace `unpublish`, `publisher.destroy()`,
  `session.disconnect()` y se quitan los listeners.
- `sessionDisconnected` y `connectionDestroyed` dejan la UI en `ended` y limpian
  los recursos locales.
- Los tests mockean el SDK: no se abre cámara ni se hace red real.

---

## 4. Alcance

### Dentro

- Dependencia `@vonage/client-sdk-video` **2.36.0** (versión exacta) en
  `frontend`.
- `postJson` en `frontend/src/api/client.ts`.
- `requestVideoToken(incidentId, role)` en `frontend/src/api/video.ts`.
- Hook `useVideoToken` con `useMutation` para pedir el token.
- Hook `useVideoCall` para inicializar/conectar/publicar/limpiar el SDK.
- Componente `VideoCall` con vídeo local y estados.
- Cableado del botón en `IncidentDetail`.
- Tests unitarios de API, hook/componente y página, con SDK y `fetch` mockeados.
- Estilos mínimos en `index.css`.

### Fuera

- Vídeo remoto, suscripciones a streams, `streamCreated`/`streamDestroyed`
  (C4).
- Toast "Visita finalizada" (C5).
- Envío de SMS o cierre de sesión en backend (A4/B3).
- Botón de colgar, reconexión automática, timeout de espera o pantalla de
  llamada finalizada (C4/I2).
- Refresco de token; el token vive 1 h y C3 no lo renueva.
- Login real, router, dashboard de gestora.
- Cambios en `backend/openapi.yaml`, `backend/prisma/schema.prisma` o backend.
- Framework de UI, CSS-in-JS, estado global o `localStorage`.
- Tests de contrato o E2E.

---

## 5. Decisiones Cerradas

| Decisión | Elección |
|---|---|
| Fuente del token | API real (`POST /api/video-tokens`); fixture solo en tests. |
| Nombre de la prop | `applicationId` (el issue decía `apiKey`; Vonage Web SDK usa Application ID). |
| Medios publicados | Audio + vídeo (`publishAudio: true`, `publishVideo: true`). |
| Layout | Sección dentro de `IncidentDetail`, debajo del detalle; vídeo local pequeño. C4 añade el remoto grande. |
| `insertMode` | `"append"` sobre un contenedor propio de React; no `"replace"`. |
| Token expirado | Fuera de alcance; TTL 1 h. |
| Persistencia del token | Solo en memoria de React Query; nunca en `localStorage`/URL/logs. |
| Cleanup | Obligatorio en unmount y en `ended`/`error`; idempotente. |
| Selector de rol | Se deshabilita cuando hay una llamada montada. |
| Al montar la llamada | Se oculta el botón de entrada; `VideoCall` ocupa su lugar. |
| Errores de token | Se muestran en la página; el botón vuelve a estar disponible para reintentar. |
| Errores del SDK | `VideoCall` muestra un mensaje genérico; no se reintenta automáticamente. |

---

## 6. Clasificación de Requisitos

### Explícitos (issue / decisiones del usuario)

- `VideoCall` recibe `applicationId`, `sessionId` y `token`.
- `useEffect` inicializa `OT.initSession(applicationId, sessionId)`,
  `session.connect(token)`, `OT.initPublisher(...)` y `session.publish(...)`.
- Cleanup obligatorio en el `return` del `useEffect`.
- Estados `idle | connecting | connected | error | ended`.
- Manejo de `sessionDisconnected` y `connectionDestroyed`.
- Test con mock del SDK, sin cámara ni red.
- Token real, audio + vídeo y layout recomendado.

### Derivados (del scaffold y del contrato actual)

- `POST /api/video-tokens` requiere `X-User-Id`, `X-User-Role` y body
  `{ incidentId }`; el frontend reutiliza el mapeo de IDs demo de C2.
- El botón dispara la petición; `VideoCall` no pide el token por su cuenta.
- Se usa TanStack Query (`useMutation`) para la petición, como exige
  `frontend/AGENTS.md`.
- `applicationId`, `sessionId` y `token` no se registran ni se persisten.
- El SDK se importa con `import OT from '@vonage/client-sdk-video'` y la versión
  queda fijada para evitar cambios silenciosos.
- El contenedor del vídeo local es un `<div>` propiedad de React; el SDK inserta
  el `<video>` dentro con `insertMode: "append"`.
- Al desmontar se quitan los listeners antes de desconectar.

### Desconocidos resueltos

| Pregunta | Respuesta |
|---|---|
| ¿API real o fixture? | API real; fixture solo en tests. |
| ¿Audio y vídeo o solo vídeo? | Audio + vídeo. |
| ¿Dónde se muestra? | Debajo del detalle; local pequeño, remoto grande en C4. |
| ¿`apiKey` o `applicationId`? | `applicationId`. |

### Desconocidos no bloqueantes

- No hay botón de colgar en C3. El cleanup se valida desmontando el componente;
  el control explícito de fin de llamada queda para C4/I2.
- No se define un timeout visual si la otra persona no entra; C4 lo decidirá.

---

## 7. Datos Mínimos y Contrato

### Petición

```http
POST /api/video-tokens
Accept: application/json
Content-Type: application/json
X-User-Id: usr_tenant_demo | usr_technician_demo
X-User-Role: TENANT | TECHNICIAN
```

```json
{ "incidentId": "inc_demo" }
```

### Respuesta 200

```json
{
  "applicationId": "string",
  "sessionId": "string",
  "token": "string"
}
```

Tipos: `VideoTokenRequest` y `VideoTokenResponse` del schema generado en
`frontend/src/api/generated/openapi.d.ts`. No se escriben a mano.

### Errores

| Status | Cuándo | Mensaje en UI |
|---|---|---|
| `400` | Cabeceras/body inválidos | "No se pudo iniciar la videollamada" |
| `403` | El usuario no es la inquilina/técnica de la incidencia | "No tienes permiso para entrar en esta videollamada" |
| `404` | La incidencia no existe | "Incidencia no encontrada" |
| `409` | Incidencia/visita/sesión no disponible | "La videollamada ya no está disponible" |
| `500` / red | Fallo inesperado | "No se pudo iniciar la videollamada" |

No se muestra el mensaje crudo del backend ni se registra el token.

---

## 8. Dependencias

### Hard

- **C1** · cliente API y tipos generados. ✅ Mergeado.
- **A3** · `POST /api/video-tokens`. ✅ En `main`.
- **C2** · pantalla contenedora y botón. ✅ En `main`.

### Soft

- Backend + seed para la demo manual.
- Credenciales Vonage reales para ver vídeo real; los tests no las usan.

### Nuevas dependencias

- `@vonage/client-sdk-video@2.36.0` (exacta, en `dependencies`).
- No se añade ningún cliente HTTP, router, librería de UI ni estado global.

---

## 9. Riesgos

- **Lockfile compartido:** #40 (A2) también toca `pnpm-lock.yaml`. Mitigación:
  implementar C3 después de mergear #40 o rebasar antes de instalar.
- **SDK en jsdom:** el SDK real no funciona en tests; hay que mockearlo y no
  importar nada que toque `navigator.mediaDevices` en el test.
- **Tipos del SDK:** el paquete usa `export = OT`; con `esModuleInterop` se
  importa como default. Verificar `tsc` al añadir la dependencia.
- **Cámara encendida:** el cleanup debe ser idempotente y cubrir unmount,
  `sessionDisconnected`, `connectionDestroyed` y errores.
- **Race de callbacks:** un callback del SDK puede llegar después del unmount;
  debe comprobar una bandera de cancelación y destruir el publisher si se creó.
- **Scope creep:** C3 no implementa vídeo remoto, toast ni botón de colgar.

---

## 10. Criterios de Aceptación (resumen)

1. El botón pide el token real y muestra "Conectando…" mientras espera.
2. Con token, `VideoCall` se monta y `OT.initSession` recibe `applicationId` y
   `sessionId`.
3. El SDK conecta con el token, publica audio + vídeo y muestra el vídeo local.
4. La UI pasa por `connecting` → `connected`.
5. `sessionDisconnected`/`connectionDestroyed` → `ended`.
6. Un error de conexión/publicación → `error`.
7. Al desmontar se ejecutan `unpublish`, `publisher.destroy()`,
   `session.disconnect()` y se quitan listeners.
8. Los tests no abren cámara ni hacen red real.
9. `pnpm check`, `pnpm test` y `pnpm build` en verde.

La especificación completa, con Given/When/Then, está en `02-specification.md`.

# 02 — Specification · C3 · VideoCall: init SDK + vídeo local + cleanup

> **Issue:** [#19](https://github.com/femCodersClub-vonage-program/homefix-connect/issues/19)
> **Rama:** `feat/C3-video-call-init` · **Size:** M
> **Base:** `01-requirements.md` · `backend/openapi.yaml` · `frontend/AGENTS.md`
> **Estado:** implementado en la rama; validación en `04-validation.md`.

---

## 1. Resumen y Contexto

C3 convierte el botón "Entrar a la videollamada" de C2 en una entrada real a la
sesión de Vonage Video. El frontend pide un token al backend, inicializa el SDK
Web, conecta, publica cámara y micrófono y muestra el vídeo local. Al desmontar,
libera siempre cámara, publisher y sesión.

**Objetivo observable:** dos personas pueden entrar a la misma sesión y verse en
local; el vídeo remoto llega en C4. La cámara no queda encendida al salir de la
pantalla.

---

## 2. Alcance

### Dentro

- `@vonage/client-sdk-video@2.36.0` como dependencia exacta.
- `postJson` en el transporte HTTP del frontend.
- `requestVideoToken(incidentId, role)` contra `POST /api/video-tokens`.
- `useVideoToken` con TanStack Query (`useMutation`).
- `useVideoCall` con el ciclo de vida del SDK.
- `VideoCall` con vídeo local, estados y `aria-live`.
- Cableado del botón y mensajes de error en `IncidentDetail`.
- Tests unitarios con `fetch` y SDK mockeados.
- Estilos mínimos para el contenedor local.

### Fuera

- Vídeo remoto, `streamCreated`, `streamDestroyed` y subscribers (C4).
- Toast de fin de visita (C5).
- Botón de colgar, reconexión, timeout o cierre de sesión en backend.
- Refresco de token o gestión de expiración.
- Cambios de backend, `openapi.yaml` o `schema.prisma`.
- Router, login real, estado global, framework de UI, E2E.

---

## 3. Casos de Uso

1. **Inquilina entra:** abre `?incidentId=inc_demo`, rol por defecto `TENANT`,
   pulsa "Entrar a la videollamada". Se pide el token con
   `X-User-Id: usr_tenant_demo` y `X-User-Role: TENANT`; se monta `VideoCall` y
   se publica su cámara/micrófono.
2. **Técnica entra:** cambia el selector a "Técnica" y pulsa el botón. Se pide el
   token con `usr_technician_demo` y `TECHNICIAN`; mismo flujo.
3. **La sesión se corta:** el SDK emite `sessionDisconnected` o
   `connectionDestroyed`; la UI pasa a `ended` y se liberan los recursos.
4. **Fallo de token:** la API responde 403/404/409/500 o falla la red; la UI
   muestra el mensaje y permite reintentar.
5. **Salida de la pantalla:** se desmonta `VideoCall`; se ejecuta el cleanup.

---

## 4. Requisitos Funcionales

- **RF-01.** Al pulsar el botón, se hace `POST /api/video-tokens` con el
  `incidentId` de la pantalla y las cabeceras del rol seleccionado.
- **RF-02.** Mientras la petición está en curso, el botón se deshabilita y
  muestra "Conectando…".
- **RF-03.** Si la petición falla, se muestra un mensaje según el status y el
  botón vuelve a estar habilitado para reintentar.
- **RF-04.** Si la petición devuelve 200, se oculta el botón y se monta
  `VideoCall` con `applicationId`, `sessionId` y `token`.
- **RF-05.** `VideoCall` llama a `OT.initSession(applicationId, sessionId)`.
- **RF-06.** `VideoCall` conecta con `session.connect(token)`.
- **RF-07.** Tras conectar, crea el publisher con `OT.initPublisher(container,
  { insertMode: "append", width: "100%", height: "100%", publishAudio: true,
  publishVideo: true })` y lo publica con `session.publish(publisher)`.
- **RF-08.** La UI refleja `idle`, `connecting`, `connected`, `error` y `ended`
  con un texto visible y `aria-live="polite"`.
- **RF-09.** Al recibir `sessionDisconnected` o `connectionDestroyed`, pasa a
  `ended` y libera los recursos locales.
- **RF-10.** Ante un error de conexión, publicación o acceso a cámara/micrófono,
  pasa a `error` y libera los recursos.
- **RF-11.** Al desmontar, ejecuta el cleanup completo, aunque haya habido un
  error o un `ended` previo.
- **RF-12.** El selector de rol se deshabilita mientras se pide el token y
  mientras hay una llamada montada.
- **RF-13.** Los tests no abren cámara ni hacen red real.

---

## 5. Reglas de Negocio

- **RN-01.** El token se pide solo cuando el botón está habilitado por el estado
  de la incidencia/visita (regla ya implementada en `JoinButton`).
- **RN-02.** El rol de la petición es el seleccionado en la pantalla; no se
  deduce de la incidencia.
- **RN-03.** No se persiste `token`, `sessionId` ni `applicationId` en
  `localStorage`, `sessionStorage`, cookies, URL o logs.
- **RN-04.** `applicationId` no es un secreto, pero `sessionId` y `token` son
  credenciales de sesión y se tratan como datos sensibles.
- **RN-05.** Un error de token no monta `VideoCall`; un error del SDK no vuelve a
  pedir token automáticamente.
- **RN-06.** El cleanup es idempotente: puede ejecutarse por evento y por unmount
  sin dobles efectos.
- **RN-07.** El SDK se importa una sola vez por módulo; no se instancia en cada
  render.
- **RN-08.** No se usa `any`; los tipos del SDK se consumen desde el paquete y
  los del contrato desde `generated/openapi.d.ts`.

---

## 6. Contrato de Entrada

### `VideoCall` props

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `applicationId` | `string` | Sí | Application ID de Vonage; primer argumento de `OT.initSession`. |
| `sessionId` | `string` | Sí | Id de la sala devuelto por A3. |
| `token` | `string` | Sí | Token JWT de conexión generado por A3. |

No recibe `apiKey`: el nombre `apiKey` del issue se sustituye por
`applicationId` para alinearse con el contrato y con Vonage.

### `POST /api/video-tokens`

| Campo | Ubicación | Tipo | Requerido | Regla |
|---|---|---|---|---|
| `X-User-Id` | header | `string` | Sí | `usr_tenant_demo` o `usr_technician_demo`. |
| `X-User-Role` | header | `"TENANT" \| "TECHNICIAN"` | Sí | Debe coincidir con el usuario. |
| `Content-Type` | header | `"application/json"` | Sí | Lo añade `postJson`. |
| `incidentId` | body | `string` | Sí | Id de la incidencia; `inc_demo` en demo. |

```json
{ "incidentId": "inc_demo" }
```

No se añaden campos nuevos al contrato.

---

## 7. Contrato de Salida

### 200 OK

```json
{
  "applicationId": "string",
  "sessionId": "string",
  "token": "string"
}
```

Se modela con `VideoTokenResponse` del schema generado. No se copia a mano.

### Estados de `VideoCall`

| Estado | Texto visible | Cuándo |
|---|---|---|
| `idle` | "Preparando videollamada…" | Render inicial antes del efecto. |
| `connecting` | "Conectando…" | Desde que arranca el efecto hasta `publish` correcto. |
| `connected` | "Conectada" | `session.publish` termina sin error. |
| `error` | "No se pudo iniciar la videollamada" | Fallo de conexión, publicación o cámara/micrófono. |
| `ended` | "Videollamada finalizada" | `sessionDisconnected` o `connectionDestroyed`. |

El texto de estado vive en un `<p role="status" aria-live="polite">`.

---

## 8. Manejo de Errores

### Errores de la petición de token

| Status | Mensaje UI | Efecto |
|---|---|---|
| `400` | "No se pudo iniciar la videollamada" | No monta `VideoCall`; botón habilitado. |
| `403` | "No tienes permiso para entrar en esta videollamada" | No monta; botón habilitado. |
| `404` | "Incidencia no encontrada" | No monta; botón habilitado. |
| `409` | "La videollamada ya no está disponible" | No monta; botón habilitado. |
| `500` / red | "No se pudo iniciar la videollamada" | No monta; botón habilitado. |

Se usa `HttpError.status`; el mensaje técnico del transporte no se muestra.

### Errores del SDK

- `OT.initSession` lanza una excepción → `error`.
- `connect` devuelve error → `error` y cleanup.
- `OT.initPublisher` devuelve error (permiso denegado, dispositivo ausente) →
  `error` y cleanup.
- `publish` devuelve error → `error` y cleanup.
- Los errores no se registran con datos sensibles; no se imprime el token.

---

## 9. Casos Límite

- **Doble clic:** el botón está deshabilitado mientras `isPending`; no se lanza
  una segunda petición.
- **Cambio de rol antes de entrar:** la siguiente petición usa el rol nuevo; el
  selector se bloquea mientras hay petición o llamada.
- **Respuesta 200 sin `VideoCall`:** no ocurre; el montaje depende de
  `mutation.data`.
- **StrictMode en desarrollo:** React ejecuta setup → cleanup → setup. La
  bandera `cancelled` y el cleanup idempotente evitan dos cámaras o callbacks
  tardíos.
- **Unmount durante la conexión:** una bandera `cancelled` evita actualizar
  estado; si el publisher ya se creó, se destruye.
- **Unmount tras `connected`:** se hace `unpublish`, `destroy` y `disconnect`.
- **`sessionDisconnected` seguido de `connectionDestroyed`:** el cleanup
  idempotente evita dobles liberaciones.
- **Callback del SDK después del cleanup:** se ignora y, si creó un publisher, se
  destruye.
- **Contenedor no disponible:** `containerRef.current === null` → `error`, sin
  llamar al SDK.
- **Navegador sin WebRTC / permiso denegado:** el SDK devuelve error → `error`;
  no se deja la UI en `connecting`.
- **Token expirado:** fuera de alcance; no se refresca.

---

## 10. Criterios de Aceptación (Given/When/Then)

1. **Entrada correcta**
   Given una incidencia `VISIT_ASSIGNED` con visita `CONFIRMED` y rol `TENANT`
   When se pulsa "Entrar a la videollamada"
   Then se hace `POST /api/video-tokens` con `incidentId: "inc_demo"`,
   `X-User-Id: "usr_tenant_demo"` y `X-User-Role: "TENANT"`
   And se muestra `VideoCall` con el `applicationId`, `sessionId` y `token`
   recibidos.

2. **Estado de espera**
   Given que la petición de token sigue en curso
   Then el botón está deshabilitado y muestra "Conectando…".

3. **Init del SDK**
   Given un `VideoCall` montado
   Then `OT.initSession` se llama con `applicationId` y `sessionId`
   And `session.connect` se llama con el token.

4. **Publicación local**
   Given que `connect` termina sin error
   Then `OT.initPublisher` se llama con el contenedor y
   `{ insertMode: "append", width: "100%", height: "100%", publishAudio: true,
   publishVideo: true }`
   And `session.publish` se llama con el publisher
   And el estado pasa a "Conectada".

5. **Fin de sesión**
   Given una llamada conectada
   When el SDK emite `sessionDisconnected` o `connectionDestroyed`
   Then el estado pasa a "Videollamada finalizada"
   And se liberan publisher y sesión.

6. **Error de conexión**
   Given una llamada en `connecting`
   When `connect` devuelve error
   Then el estado pasa a "No se pudo iniciar la videollamada"
   And se liberan los recursos.

7. **Cleanup al desmontar**
   Given una llamada conectada
   When se desmonta `VideoCall`
   Then se llama a `session.unpublish(publisher)`, `publisher.destroy()`,
   `session.disconnect()` y se quitan los listeners.

8. **Error de token 409**
   Given que la API responde 409
   When se pulsa el botón
   Then se muestra "La videollamada ya no está disponible"
   And no se monta `VideoCall`
   And el botón vuelve a estar habilitado.

9. **Error de token 403**
   Given que la API responde 403
   Then se muestra "No tienes permiso para entrar en esta videollamada".

10. **Error de red**
    Given que `fetch` rechaza
    Then se muestra "No se pudo iniciar la videollamada"
    And el botón vuelve a estar habilitado.

11. **Rol técnico**
    Given el rol "Técnica"
    When se pulsa el botón
    Then la petición usa `usr_technician_demo` y `TECHNICIAN`.

12. **Sin cámara en tests**
    Given la suite de C3
    Then el SDK está mockeado y no se accede a `navigator.mediaDevices`.

---

## 11. Diseño Técnico

### Capas y archivos

```text
frontend/src/
├── api/
│   ├── client.ts          # getJson + postJson + HttpError
│   ├── incidents.ts       # userHeaders() compartido + getIncident
│   └── video.ts           # requestVideoToken + tipos del contrato
├── hooks/
│   ├── useVideoToken.ts   # useMutation del token
│   └── useVideoCall.ts    # ciclo de vida del SDK
├── components/
│   ├── JoinButton.tsx     # isConnecting opcional
│   └── VideoCall.tsx      # contenedor local + estado
├── pages/
│   └── IncidentDetail.tsx # dispara token y monta VideoCall
└── index.css              # estilos del stage local
```

### Transporte: `client.ts`

```ts
export type PostJsonOptions = {
  headers?: Record<string, string>;
};

export async function postJson<TResponse, TBody>(
  path: string,
  body: TBody,
  options: PostJsonOptions = {},
): Promise<TResponse> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new HttpError(
      `POST ${path} respondió ${response.status}`,
      response.status,
    );
  }

  return (await response.json()) as TResponse;
}
```

`getJson` conserva su firma y comportamiento. No se añade un cliente HTTP
externo.

### API de vídeo: `video.ts`

```ts
import { postJson } from './client.js';
import { userHeaders, type UserRole } from './incidents.js';
import type { components } from './generated/openapi.js';

type Schemas = components['schemas'];

export type VideoTokenRequest = Schemas['VideoTokenRequest'];
export type VideoTokenResponse = Schemas['VideoTokenResponse'];

export function requestVideoToken(
  incidentId: string,
  role: UserRole,
): Promise<VideoTokenResponse> {
  return postJson<VideoTokenResponse, VideoTokenRequest>(
    '/api/video-tokens',
    { incidentId },
    { headers: userHeaders(role) },
  );
}
```

`incidents.ts` exporta `userHeaders(role)` para no duplicar el mapeo de IDs demo:

```ts
export function userHeaders(role: UserRole): Record<string, string> {
  return {
    'X-User-Id': demoUserIdByRole[role],
    'X-User-Role': role,
  };
}
```

### Token: `useVideoToken.ts`

```ts
export function useVideoToken(incidentId: string, role: UserRole) {
  return useMutation<VideoTokenResponse, Error, void>({
    mutationKey: ['video-token', incidentId, role],
    mutationFn: () => requestVideoToken(incidentId, role),
    retry: false,
  });
}
```

- Sin reintentos automáticos: un 403/409 no mejora solo.
- El token solo vive en `mutation.data`.
- No se guarda en storage ni se registra.

### SDK: `useVideoCall.ts`

Firma:

```ts
type UseVideoCallParams = {
  applicationId: string;
  sessionId: string;
  token: string;
  containerRef: RefObject<HTMLDivElement | null>;
};

export type VideoCallStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'error'
  | 'ended';

export function useVideoCall(params: UseVideoCallParams): VideoCallStatus;
```

Secuencia del efecto:

1. Leer `containerRef.current`; si no existe, `error`.
2. `session = OT.initSession(applicationId, sessionId)`.
3. Registrar `sessionDisconnected` y `connectionDestroyed`.
4. `setStatus('connecting')`.
5. `session.connect(token, callback)`.
6. En éxito: `publisher = OT.initPublisher(container, { insertMode: 'append',
   width: '100%', height: '100%', publishAudio: true, publishVideo: true },
   callback)`.
7. En éxito: `session.publish(publisher, callback)`.
8. En éxito: `setStatus('connected')`.
9. Cualquier error: `setStatus('error')` + cleanup.
10. Eventos de desconexión: `setStatus('ended')` + cleanup.

Cleanup:

```ts
function cleanup() {
  if (cleaned) return;
  cleaned = true;
  session?.off('sessionDisconnected', onDisconnected);
  session?.off('connectionDestroyed', onConnectionDestroyed);
  if (publisher) {
    session?.unpublish(publisher);
    publisher.destroy();
    publisher = null;
  }
  void session?.disconnect();
  session = null;
}
```

- `cleanup` se llama en el `return` del efecto, en `ended` y en `error`.
- `cancelled` evita `setState` después del unmount.
- Los callbacks del SDK comprueban `cancelled`/`cleaned`.
- `unpublish`/`destroy`/`disconnect` no deben romper si ya se limpió.
- El orden es: quitar listeners → unpublish → destroy → disconnect. Así un
  `disconnect` por error no convierte el estado en `ended`.

### Componente: `VideoCall.tsx`

```tsx
export function VideoCall({
  applicationId,
  sessionId,
  token,
}: VideoCallProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const status = useVideoCall({
    applicationId,
    sessionId,
    token,
    containerRef,
  });

  return (
    <section className="video-call" aria-labelledby="video-call-title">
      <h2 id="video-call-title">Videollamada</h2>
      <p role="status" aria-live="polite">
        {statusLabels[status]}
      </p>
      <div className="video-call__stage">
        <div
          ref={containerRef}
          className="video-call__local"
          aria-label="Vídeo local"
        />
      </div>
    </section>
  );
}
```

- El `<video>` lo inserta el SDK dentro de `video-call__local`.
- El componente no hace `fetch` ni decide el rol.
- El estado se muestra siempre, también en `error`/`ended`.

### Página: `IncidentDetail.tsx`

```tsx
const videoToken = useVideoToken(incidentId, role);
const hasVideoCall = videoToken.data !== undefined;
const roleLocked = hasVideoCall || videoToken.isPending;

function handleRoleChange(nextRole: UserRole) {
  setRole(nextRole);
  videoToken.reset();
}
```

- Radios con `disabled={roleLocked}`.
- Si `hasVideoCall`, renderizar `VideoCall` y no `JoinButton`.
- Si no, `JoinButton` con `onClick={() => videoToken.mutate()}` y
  `isConnecting={videoToken.isPending}`.
- Si `videoToken.isError`, mostrar un `<p role="alert" className="error">` con
  el mensaje mapeado por status.
- El botón sigue disponible tras un error para reintentar.

### `JoinButton.tsx`

Se añade `isConnecting?: boolean`:

```ts
type JoinButtonProps = {
  incidentStatus: IncidentStatus;
  visitStatus: VisitStatus | null;
  onClick?: () => void;
  isConnecting?: boolean;
};
```

- Si `isConnecting`: label "Conectando…" y `disabled`.
- En caso contrario, se mantiene la tabla de C2.
- No cambia el comportamiento sin `isConnecting`.

### Contratos y base de datos

- **Sin cambios** en `backend/openapi.yaml`, `backend/prisma/schema.prisma` ni
  backend.
- No se ejecuta `pnpm gen:types`: `VideoTokenRequest`/`VideoTokenResponse` ya
  están generados en C1.
- `frontend/package.json` y `pnpm-lock.yaml` cambian por la dependencia del SDK.

---

## 12. Estrategia de Pruebas

### `frontend/src/api/video.test.ts`

1. `requestVideoToken` hace `POST /api/video-tokens`.
2. Envía `Content-Type`, `X-User-Id` y `X-User-Role`.
3. Envía `{ incidentId }` en el body.
4. Devuelve `VideoTokenResponse`.
5. Un 409 lanza `HttpError` con `status: 409`.
6. Un error de red se propaga.

### `frontend/src/components/VideoCall.test.tsx`

Mock del SDK:

```ts
vi.mock('@vonage/client-sdk-video', () => ({
  default: { initSession, initPublisher },
}));
```

Casos:

1. Monta y llama a `OT.initSession(applicationId, sessionId)`.
2. Conecta con el token.
3. Crea el publisher con `insertMode: "append"`, audio y vídeo.
4. Publica el publisher y muestra "Conectada".
5. Muestra "Conectando…" antes de conectar.
6. `sessionDisconnected` → "Videollamada finalizada".
7. `connectionDestroyed` → "Videollamada finalizada".
8. Error de `connect` → "No se pudo iniciar la videollamada".
9. Error de `initPublisher` → error.
10. Error de `publish` → error.
11. Unmount → `unpublish`, `destroy`, `disconnect` y `off`.
12. `aria-live="polite"` en el estado.
13. No se accede a cámara real.

### `frontend/src/pages/IncidentDetail.test.tsx`

Se mockea `VideoCall` para aislar el SDK:

```ts
vi.mock('../components/VideoCall.js', () => ({
  VideoCall: ({ applicationId, sessionId, token }: VideoCallProps) => (
    <div data-testid="video-call">
      {applicationId}:{sessionId}:{token}
    </div>
  ),
}));
```

Casos nuevos:

1. Click con rol `TENANT` → POST con cabeceras y body correctos.
2. Mientras el token está pendiente → "Conectando…" y botón deshabilitado.
3. Token 200 → se renderiza `VideoCall` con los tres valores.
4. Token 403 → mensaje de permiso.
5. Token 409 → "La videollamada ya no está disponible".
6. Token 500/red → mensaje genérico.
7. Tras error, el botón vuelve a estar habilitado.
8. Rol `TECHNICIAN` → cabeceras y body correctos.
9. Con llamada montada, el selector de rol está deshabilitado.

Los tests existentes de C2 deben seguir pasando sin cambios de comportamiento.

### `frontend/src/api/types.test.ts`

Añadir:

```ts
test('VideoTokenResponse es el schema generado', () => {
  expectTypeOf<VideoTokenResponse>().toEqualTypeOf<
    components['schemas']['VideoTokenResponse']
  >();
});
```

### Aislamiento

- `fetch` mockeado con `vi.stubGlobal`; sin red.
- SDK mockeado; sin cámara, sin `navigator.mediaDevices`.
- `QueryClient` con `retry: false`.
- Sin Postgres.
- Sin snapshots.

---

## 13. Dependencias

- **C1** ✅ · `client.ts`, tipos generados y `getIncident`.
- **C2** ✅ · `IncidentDetail`, `JoinButton`, fixture y patrón de tests.
- **A3** ✅ · `POST /api/video-tokens` y `VideoTokenResponse`.
- **Vonage Video Web SDK** · `@vonage/client-sdk-video@2.36.0`.
- **TanStack Query 5** · `useMutation`.
- **Testing Library** y **Vitest** ya instalados.
- **Credenciales Vonage** solo para la demo manual; no para tests.

---

## 14. Preguntas Abiertas y Suposiciones

### Suposiciones aprobadas

- `applicationId` sustituye a `apiKey` en la prop y en la documentación.
- El token real se pide en C3; el fixture queda solo para tests.
- Se publican audio y vídeo desde C3.
- El vídeo local se muestra pequeño abajo del detalle; C4 añade el remoto.
- No hay botón de colgar en C3; el cleanup se prueba desmontando.

### Fuera de decisión de C3

- Qué mostrar si la otra persona no entra en 30 s (C4).
- Reconexión automática (I2).
- Toast de fin de visita (C5).
- Cierre de sesión y SMS (A4/B3/C5).

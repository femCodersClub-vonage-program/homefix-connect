# 02 — Specification · C4 · VideoCall: vídeo remoto + eventos

> **Issue:** [#20](https://github.com/femCodersClub-vonage-program/homefix-connect/issues/20)
> **Rama:** `feat/C4-video-remote` · **Size:** S · **Closes #20**
> **Base:** `01-requirements.md` · `frontend/AGENTS.md` §5 · `@vonage/client-sdk-video@2.36.0`
> **Estado:** pendiente de aprobar `03-plan.md` antes de implementar.

---

## 1. Resumen y Contexto

C3 deja la videollamada con vídeo local, cleanup y estados, pero todavía no
suscribe al stream de la otra persona. C4 cierra el escenario 2 del MVP:
inquilina y técnica se ven y se oyen en la misma sesión de Vonage.

**Objetivo observable:** con dos participantes en la misma incidencia, cada uno
ve el vídeo remoto del otro; cuando ese stream desaparece, la UI pasa a
"Desconectada" y se liberan los recursos.

---

## 2. Alcance

### Dentro

- Registrar `streamCreated` y `streamDestroyed` en la sesión existente.
- Suscribir el stream remoto con `session.subscribe(...)` en un contenedor
  propio, distinto del local.
- Exponer un estado derivado `remoteConnected` para mostrar el placeholder
  "Esperando a la otra persona…".
- Llamar a `session.unsubscribe(...)` en `streamDestroyed` y en el cleanup.
- Ampliar el cleanup de C3 para quitar los dos listeners nuevos.
- Cambiar el texto del estado `ended` a "Desconectada".
- Tests unitarios con el SDK mockeado: sin cámara, sin red y sin streams reales.
- Ajustes mínimos de CSS para remote grande y local pequeño.

### Fuera

- Reconexión automática (I2).
- Timeout visual de 30 s; el placeholder no tiene temporizador.
- Toast de fin de visita y bloqueo del botón (C5).
- Envío de SMS, cierre de sesión en backend y webhooks (A4/B3/X3).
- Cambios en `backend/openapi.yaml`, `backend/prisma/schema.prisma` ni backend.
- Nuevas dependencias; el SDK Web ya está fijado en C3.
- Gestión de varios streams remotos, screen sharing o llamadas grupales.
- Refresco de token, login real, router, estado global, Pact ni Playwright.

---

## 3. Casos de Uso

1. **Inquilina entra primero:** ve su vídeo local y, mientras no llega la
   técnica, el texto "Esperando a la otra persona…". El estado global sigue
   siendo "Conectada".
2. **Técnica entra:** el SDK emite `streamCreated` para la inquilina en la
   sesión de la técnica y viceversa. Cada cliente suscribe ese stream y muestra
   el vídeo remoto.
3. **Una persona cierra su stream:** el otro cliente recibe `streamDestroyed`,
   desuscribe, pasa a "Desconectada" y limpia publisher y sesión.
4. **Se cierra la sesión entera:** `sessionDisconnected` o
   `connectionDestroyed` siguen pasando a "Desconectada" como en C3.
5. **Fallo al suscribir:** se pasa a "No se pudo iniciar la videollamada" y se
   limpian los recursos.

---

## 4. Requisitos Funcionales

- **RF-01.** `useVideoCall` acepta un segundo ref: `remoteContainerRef`.
- **RF-02.** Antes de `session.connect`, se registran `streamCreated` y
  `streamDestroyed` junto a los listeners existentes.
- **RF-03.** En `streamCreated`, se ignora el stream local comparando
  `event.stream.connection.connectionId` con `session.connection?.connectionId`.
- **RF-04.** En `streamCreated`, se suscribe como máximo un stream remoto; el
  segundo stream se ignora porque el MVP es 1-a-1.
- **RF-05.** La suscripción usa
  `session.subscribe(stream, remoteContainerRef.current, subscriberOptions,
  callback)` con `insertMode: "append"`, `width`/`height` al 100 %,
  `subscribeToAudio: true` y `subscribeToVideo: true`.
- **RF-06.** Tras la suscripción correcta, `remoteConnected` pasa a `true` y el
  placeholder desaparece.
- **RF-07.** En `streamDestroyed`, solo se actúa si `event.stream.streamId`
  coincide con el stream suscrito.
- **RF-08.** Al desaparecer ese stream se desuscribe, `remoteConnected` pasa a
  `false`, el estado pasa a `ended` y se ejecuta el cleanup completo.
- **RF-09.** El cleanup quita los cuatro listeners, desuscribe el remoto, hace
  `unpublish`, `publisher.destroy()` y `session.disconnect()`.
- **RF-10.** El cleanup sigue siendo idempotente aunque lo disparen dos eventos,
  un error y el unmount.
- **RF-11.** El texto del estado `ended` es "Desconectada".
- **RF-12.** Mientras `status === "connected"` y `remoteConnected === false`,
  se muestra "Esperando a la otra persona…".
- **RF-13.** El texto de estado mantiene `role="status"` y
  `aria-live="polite"`.
- **RF-14.** Los tests no abren cámara ni hacen red real.

---

## 5. Reglas de Negocio

- **RN-01.** No se subscribe al propio stream publicado por el cliente.
- **RN-02.** Solo se mantiene una suscripción remota a la vez.
- **RN-03.** `remoteConnected` es derivado del evento del SDK; no se persiste.
- **RN-04.** No se guardan `streamId`, `connectionId` ni datos del subscriber
  fuera del efecto del hook.
- **RN-05.** `sessionDestroyed` no cambia el estado global de la llamada; solo
  limpia el subscriber si afecta al stream suscrito.
- **RN-06.** Los errores del SDK se muestran de forma genérica; no se registran
  tokens, session ids ni ids de conexión.
- **RN-07.** El placeholder no es un error: no corta la llamada ni dispara
  reintentos.
- **RN-08.** No se usa `any`; los tipos vienen de `@vonage/client-sdk-video`.

---

## 6. Contrato de Entrada

### Props de `VideoCall` (sin cambios)

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `applicationId` | `string` | Sí | Application ID de Vonage. |
| `sessionId` | `string` | Sí | Id de la sala devuelto por A3. |
| `token` | `string` | Sí | Token JWT de conexión generado por A3. |

### Parámetros de `useVideoCall`

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `applicationId` | `string` | Sí | Igual que la prop. |
| `sessionId` | `string` | Sí | Igual que la prop. |
| `token` | `string` | Sí | Igual que la prop. |
| `containerRef` | `RefObject<HTMLDivElement \| null>` | Sí | Contenedor del vídeo local (C3). |
| `remoteContainerRef` | `RefObject<HTMLDivElement \| null>` | Sí | Contenedor del vídeo remoto (nuevo en C4). |

### Eventos del SDK consumidos

| Evento | Campo usado | Origen |
|---|---|---|
| `streamCreated` | `stream` | `opentok.d.ts:632` |
| `streamDestroyed` | `stream` | `opentok.d.ts:636` |

`stream.streamId` y `stream.connection.connectionId` vienen tipados por el SDK
(`opentok.d.ts:252`).

---

## 7. Contrato de Salida

No hay nuevo contrato HTTP. La salida observable es la UI y el valor devuelto
por el hook.

### `VideoCallStatus` (sin cambios en los valores)

| Valor | Texto visible | Cuándo |
|---|---|---|
| `idle` | "Preparando videollamada…" | Render inicial. |
| `connecting` | "Conectando…" | Hasta que `publish` termina bien (C3). |
| `connected` | "Conectada" | `publish` correcto (C3). |
| `error` | "No se pudo iniciar la videollamada" | Fallo de conexión, publicación o suscripción. |
| `ended` | **"Desconectada"** | `sessionDisconnected`, `connectionDestroyed` o `streamDestroyed` del remoto. |

### Valor devuelto por `useVideoCall`

```ts
export type VideoCallState = {
  status: VideoCallStatus;
  remoteConnected: boolean;
};
```

`remoteConnected` es `false` en `idle`/`connecting`/`error`/`ended` y `true`
desde que `streamCreated` suscribe correctamente hasta que se limpia.

---

## 8. Manejo de Errores

No se introducen nuevos códigos HTTP: los errores de token siguen siendo los de
C3 (`400/403/404/409/500`).

| Situación | Efecto en C4 |
|---|---|
| `session.subscribe` lanza excepción | `error` + cleanup. |
| Callback de `session.subscribe` devuelve error | `error` + cleanup. |
| `remoteContainerRef.current === null` al llegar el stream | `error` + cleanup. |
| Callback tardío tras unmount | Se ignora; si se creó el subscriber, se desuscribe. |
| `session.unsubscribe` lanza al limpiar | Se ignora; el cleanup continúa. |

Los mensajes de error del SDK no se muestran crudos ni se registran.

---

## 9. Casos Límite

- **Stream propio:** no se suscribe.
- **Dos streams remotos:** se suscribe el primero; el resto se ignora.
- **`streamDestroyed` de otro stream:** no cambia el estado ni desuscribe.
- **`streamDestroyed` antes de `streamCreated`:** no hace nada.
- **`streamDestroyed` y `connectionDestroyed` juntos:** el flag `cleaned`
  evita dobles liberaciones.
- **Unmount durante `streamCreated`:** si el subscriber se creó después del
  cleanup, se desuscribe inmediatamente.
- **StrictMode:** setup → cleanup → setup no deja dos subscripciones ni dos
  publishers gracias a `disposed`, `cleaned` y `remoteStreamId`.
- **Contenedor remoto ausente:** pasa a `error`; no se llama a `subscribe`.
- **Sin timeout:** el placeholder permanece mientras haya `connected` sin
  stream remoto; no se corta la llamada.

---

## 10. Criterios de Aceptación (Given / When / Then)

1. **Vídeo remoto**
   Given inquilina y técnica están conectadas a la misma sesión
   When el SDK emite `streamCreated` con el stream de la otra persona
   Then se llama a `session.subscribe` con ese stream y el contenedor remoto
   And `remoteConnected` pasa a `true`.

2. **No se suscribe al local**
   Given un `streamCreated` cuyo `connectionId` es el de `session.connection`
   When llega el evento
   Then no se llama a `session.subscribe`.

3. **Placeholder**
   Given la llamada está `connected` y no hay stream remoto
   Then se muestra "Esperando a la otra persona…".

4. **Desaparición del remoto**
   Given hay un subscriber activo para `stream_123`
   When llega `streamDestroyed` con `streamId: "stream_123"`
   Then se llama a `session.unsubscribe(subscriber)`
   And el estado pasa a "Desconectada".

5. **Evento ajeno ignorado**
   Given hay un subscriber activo para `stream_123`
   When llega `streamDestroyed` con `streamId: "stream_999"`
   Then no se desuscribe nada y el estado no cambia.

6. **Fin de sesión**
   Given una llamada con vídeo remoto
   When el SDK emite `sessionDisconnected` o `connectionDestroyed`
   Then se desuscribe el remoto, se limpia el publisher y se muestra
   "Desconectada".

7. **Error de suscripción**
   Given el callback de `session.subscribe` devuelve error
   Then se muestra "No se pudo iniciar la videollamada"
   And se ejecuta el cleanup completo.

8. **Cleanup**
   Given una llamada con subscriber remoto
   When se desmonta `VideoCall`
   Then se hacen `off` de los cuatro eventos, `unsubscribe`, `unpublish`,
   `publisher.destroy()` y `session.disconnect()`.

9. **Accesibilidad**
   Given cualquier cambio de estado
   Then el texto sigue en `role="status"` con `aria-live="polite"`.

10. **Aislamiento de tests**
    Given la suite de C4
    Then el SDK está mockeado y no se accede a `navigator.mediaDevices`.

---

## 11. Diseño Técnico

### Ficheros

```text
frontend/src/
├── hooks/useVideoCall.ts       # MODIFY: listeners, subscriber, estado derivado
├── components/VideoCall.tsx    # MODIFY: ref remoto + placeholder + texto ended
└── index.css                   # MODIFY: stage remoto + local superpuesto
```

Sin ficheros nuevos. Sin cambios en `api/`, `pages/`, backend ni lockfile.

### Firma del hook

```ts
export type VideoCallState = {
  status: VideoCallStatus;
  remoteConnected: boolean;
};

export function useVideoCall(
  params: UseVideoCallParams,
): VideoCallState;
```

### Opciones del subscriber

```ts
const subscriberOptions = {
  insertMode: 'append',
  width: '100%',
  height: '100%',
  subscribeToAudio: true,
  subscribeToVideo: true,
} as const;
```

### Estado local del efecto

```ts
let subscriber: OT.Subscriber | null = null;
let remoteStreamId: string | null = null;
```

### `streamCreated`

1. Ignorar si `disposed`, `cleaned`, `subscriber` o `remoteStreamId` ya existe.
2. Ignorar si el `connectionId` del stream es el local.
3. Leer `remoteContainerRef.current`; si no existe, `fail()`.
4. Guardar `remoteStreamId = event.stream.streamId`.
5. Llamar a `session.subscribe(stream, remoteTarget, subscriberOptions, cb)`.
6. Asignar el subscriber devuelto.
7. Si llegó tarde tras cleanup, desuscribirlo y salir.
8. Si no hay error, `setRemoteConnected(true)`.

### `streamDestroyed`

1. Ignorar si no coincide con `remoteStreamId`.
2. `setRemoteConnected(false)`.
3. `setStatus('ended')`.
4. `cleanup()`; el propio cleanup desuscribe.

### Cleanup ampliado

Orden: quitar listeners → desuscribir remoto → `unpublish` → `destroy` →
`disconnect`. Se reutiliza el flag `cleaned` existente. El unsubscribe se hace
en un helper que pone `subscriber` y `remoteStreamId` a `null` antes de llamar
al SDK.

### Componente

```tsx
const remoteContainerRef = useRef<HTMLDivElement>(null);
const { status, remoteConnected } = useVideoCall({
  applicationId,
  sessionId,
  token,
  containerRef,
  remoteContainerRef,
});
```

Render del stage:

```tsx
<div className="video-call__stage">
  <div className="video-call__remote-wrap">
    <div
      ref={remoteContainerRef}
      className="video-call__remote"
      aria-label="Vídeo remoto"
    />
    {status === 'connected' && !remoteConnected ? (
      <p className="video-call__waiting">Esperando a la otra persona…</p>
    ) : null}
  </div>
  <div
    ref={containerRef}
    className="video-call__local"
    aria-label="Vídeo local"
  />
</div>
```

El `<video>` remoto lo inserta el SDK dentro de `video-call__remote`, igual que
en C3 con el local.

### CSS

- `.video-call__stage` pasa a `position: relative` y ancho máximo `40rem`.
- `.video-call__remote`, `.video-call__remote video` ocupan el 100 %.
- `.video-call__waiting` se centra sobre el remoto con `position: absolute`.
- `.video-call__local` pasa a miniatura inferior derecha.

---

## 12. Estrategia de Pruebas

### `frontend/src/components/VideoCall.test.tsx` (modificado)

El mock de sesión añade `connection`, `subscribe` y `unsubscribe`. Los casos
nuevos y ajustados son:

1. `streamCreated` remoto → `subscribe` con stream, contenedor remoto y
   `subscriberOptions`.
2. `streamCreated` propio → sin `subscribe`.
3. `streamCreated` duplicado → un solo `subscribe`.
4. Placeholder visible en `connected` sin remoto y oculto tras suscribir.
5. `streamDestroyed` del stream suscrito → `unsubscribe` + "Desconectada".
6. `streamDestroyed` de otro stream → sin cambios.
7. `sessionDisconnected` y `connectionDestroyed` → "Desconectada" (texto
   actualizado).
8. Error en callback de `subscribe` → "No se pudo iniciar la videollamada" y
   cleanup.
9. Cleanup → `off` de los cuatro eventos + `unsubscribe` + limpieza previa.
10. Sin acceso a `navigator.mediaDevices`.

`IncidentDetail.test.tsx` no cambia: mockea `VideoCall` y las props siguen
siendo las mismas.

### Aislamiento

- `vi.mock('@vonage/client-sdk-video')`.
- Sin `fetch` nuevo; sin Postgres; sin streams reales.
- `act()` para disparar los handlers registrados con `session.on`.

---

## 13. Dependencias

- **C3** ✅ · `useVideoCall`, `VideoCall`, estados y cleanup idempotente.
- **C2** ✅ · contenedor y patrón de tests de página.
- **SDK** · `@vonage/client-sdk-video@2.36.0`, ya instalado en C3.
- **TanStack Query / Testing Library / Vitest** · ya en el stack.

No se añaden dependencias ni se ejecuta `pnpm gen:types`.

---

## 14. Preguntas Abiertas y Suposiciones

### Decisiones cerradas en el issue

- Texto `ended` = "Desconectada"; el valor interno del estado no cambia.
- `streamDestroyed` cierra toda la llamada, igual que `connectionDestroyed`.
- El vídeo remoto usa un `<div ref>`; el SDK inserta el `<video>`.
- No hay timeout de 30 s en C4; queda para I2/post-MVP.
- La reconexión automática sigue fuera de alcance.

### Suposiciones derivadas aprobadas en el plan

- `useVideoCall` pasa a devolver `{ status, remoteConnected }` para que el
  componente sepa cuándo mostrar el placeholder sin consultar el DOM.
- Solo se suscribe un stream remoto porque el MVP es estrictamente 1-a-1.
- El placeholder se muestra solo en `connected`; en `connecting`, `error` y
  `ended` el texto de estado ya describe la situación.

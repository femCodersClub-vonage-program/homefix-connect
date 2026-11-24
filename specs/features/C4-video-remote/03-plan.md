# 03 — Plan · C4 · VideoCall: vídeo remoto + eventos

> **Issue:** [#20](https://github.com/femCodersClub-vonage-program/homefix-connect/issues/20)
> **Rama:** `feat/C4-video-remote` · **Size:** S
> **Base:** `02-specification.md` · **Estado:** pendiente de aprobación.
> No se toca código hasta que este plan esté aprobado explícitamente.

---

## 1. Ficheros Afectados

### Modificados

- `[MODIFY] frontend/src/hooks/useVideoCall.ts`
  - Añadir `remoteContainerRef` a `UseVideoCallParams`.
  - Pasar a devolver `{ status, remoteConnected }`.
  - Registrar y quitar `streamCreated` / `streamDestroyed`.
  - Guardar `subscriber` y `remoteStreamId` dentro del efecto.
  - Añadir `subscribeRemote`, `unsubscribeRemote` y `handleRemoteGone`.
  - Ampliar `cleanup` sin cambiar su flag `cleaned`.
- `[MODIFY] frontend/src/components/VideoCall.tsx`
  - Crear `remoteContainerRef`.
  - Consumir el nuevo objeto devuelto por el hook.
  - Renderizar el contenedor remoto, el placeholder y el texto "Desconectada".
- `[MODIFY] frontend/src/components/VideoCall.test.tsx`
  - Ampliar el mock del SDK con `connection`, `subscribe` y `unsubscribe`.
  - Ajustar expectativas de "Videollamada finalizada" a "Desconectada".
  - Añadir casos de stream propio, suscripción, placeholder, desuscripción y
    cleanup ampliado.
- `[MODIFY] frontend/src/index.css`
  - `.video-call__stage` con `position: relative` y ancho mayor.
  - `.video-call__remote-wrap`, `.video-call__remote`, `.video-call__waiting`.
  - `.video-call__local` como miniatura superpuesta.
- `[MODIFY] frontend/AGENTS.md`
  - Actualizar §5 con `streamCreated` / `streamDestroyed`, el placeholder y el
    estado "Desconectada".

### Sin cambios

- `frontend/src/api/*`, `frontend/src/pages/*`, `frontend/src/main.tsx`.
- `frontend/src/pages/IncidentDetail.test.tsx` (las props de `VideoCall` no
  cambian).
- `backend/*`, `backend/openapi.yaml`, `backend/prisma/schema.prisma`.
- `frontend/package.json`, `pnpm-lock.yaml`, `vite.config.ts`.
- No se crean ficheros nuevos. `04-validation.md` se escribe después de
  implementar y validar.

---

## 2. Contratos y Base de Datos

- **Sin cambios de contrato ni de BD.** No aplica `pnpm gen:types`.
- No se añaden dependencias: `@vonage/client-sdk-video@2.36.0` ya está fijado
  en C3.
- No se toca `pnpm-lock.yaml`, evitando el solapamiento con las ramas de
  mensajería que sí lo modifican.
- `cambio` → `specs/features/C4-video-remote/02-specification.md` es la única
  fuente de verdad del comportamiento.

---

## 3. Estrategia TDD

### Fase roja

1. Ampliar `VideoCall.test.tsx`:
   - `session.connection = { connectionId: 'conn_local' }`.
   - `session.subscribe` devuelve `subscriber = { stream, streamId }`.
   - `session.unsubscribe` como `vi.fn()`.
   - Los handlers se guardan en un `Map<string, Array<Handler>>` porque ahora
     hay cuatro eventos y `streamCreated` / `streamDestroyed` reciben argumento.
2. Añadir tests nuevos:
   - `streamCreated` remoto → `subscribe` con el contenedor remoto.
   - `streamCreated` propio → sin `subscribe`.
   - Segundo `streamCreated` → un solo `subscribe`.
   - Placeholder visible en `connected` y oculto tras suscribir.
   - `streamDestroyed` del stream suscrito → `unsubscribe` + "Desconectada".
   - `streamDestroyed` ajeno → sin cambios.
   - Error de `subscribe` → error + cleanup.
   - Cleanup → `off` de los cuatro eventos + `unsubscribe`.
3. Ejecutar `pnpm --filter frontend test` y comprobar que falla por
   comportamiento ausente, no por error de entorno.

### Fase verde

1. `useVideoCall.ts`: parámetro `remoteContainerRef`, tipo de retorno y lógica
   de subscriber.
2. `VideoCall.tsx`: refs, destructure del estado y markup del remoto.
3. `index.css`: layout remoto/local y placeholder.
4. `frontend/AGENTS.md`: actualizar la guía de la pantalla de vídeo.
5. Repetir `pnpm --filter frontend test` hasta verde.

### Mocks y dobles

- `vi.mock('@vonage/client-sdk-video')` con `default: sdk`.
- Sin `navigator.mediaDevices`, sin cámara y sin red.
- `act()` para disparar los handlers capturados.
- `fetch` no interviene en C4; `IncidentDetail.test.tsx` sigue mockeando
  `VideoCall`.

---

## 4. Orden Secuencial de Ejecución

1. Tras aprobar este plan, crear la rama `feat/C4-video-remote` desde `main`
   (que ya contiene C3 en `5f72025`).
2. Escribir los tests en rojo sobre `VideoCall.test.tsx` y verificar el fallo.
3. Implementar `useVideoCall.ts` siguiendo el orden del spec:
   refs → handlers → subscribe → unsubscribe → cleanup ampliado.
4. Implementar `VideoCall.tsx` con el contenedor remoto y el placeholder.
5. Ajustar `index.css`.
6. Actualizar `frontend/AGENTS.md` §5.
7. Ejecutar verificaciones: `pnpm --filter frontend test`, `pnpm check`,
   `pnpm test`, `pnpm build`.
8. Demo manual: `pnpm db:up`, `pnpm db:seed`, `pnpm dev`; abrir dos pestañas con
   `?incidentId=inc_demo`, una como `TENANT` y otra como `TECHNICIAN`, y
   comprobar que ambas ven el vídeo de la otra.
9. Escribir `04-validation.md` con evidencia real y proponer el cambio sin
   publicar nada sin autorización.

---

## 5. Riesgos Técnicos y Mitigaciones

- **React vs SDK sobre el mismo nodo:** el placeholder vive en un `<p>` hermano
  del `<div>` remoto; React nunca renderiza dentro del contenedor del SDK.
- **Subscriber tardío:** si `subscribe` devuelve después del cleanup, se
  desuscribe de inmediato antes de salir.
- **Doble limpieza:** `cleaned` evita repetir `unsubscribe` / `unpublish` /
  `destroy` / `disconnect` cuando llegan dos eventos.
- **Stream propio:** se compara `connectionId` con `session.connection` para no
  suscribir al publisher local.
- **Orden del cleanup:** primero `off`, después `unsubscribe`, luego publisher
  y finalmente `disconnect`; así un evento de desconexión no sobrescribe el
  estado con `ended` durante un error.
- **Texto renombrado:** los tests de C3 esperan "Videollamada finalizada"; se
  actualizan a "Desconectada" en el mismo PR.
- **Firma del hook:** solo `VideoCall` consume `useVideoCall`; el cambio a
  `{ status, remoteConnected }` no afecta a otras pantallas.
- **Dos pestañas en localhost:** basta para validar el slice C4; ngrok se
  reserva para I1.

---

## 6. Matriz de Trazabilidad

| AC (02-specification) | Validación |
|---|---|
| 1. Vídeo remoto | `VideoCall.test.tsx` · `streamCreated` → `subscribe` |
| 2. No suscribir al local | `VideoCall.test.tsx` · `connectionId` local |
| 3. Placeholder | `VideoCall.test.tsx` · texto visible/oculto |
| 4. Desaparición del remoto | `VideoCall.test.tsx` · `streamDestroyed` → `unsubscribe` + "Desconectada" |
| 5. Evento ajeno | `VideoCall.test.tsx` · `streamId` distinto |
| 6. Fin de sesión | `VideoCall.test.tsx` · `sessionDisconnected` / `connectionDestroyed` |
| 7. Error de suscripción | `VideoCall.test.tsx` · callback con error |
| 8. Cleanup | `VideoCall.test.tsx` · `off` x4 + `unsubscribe` + limpieza C3 |
| 9. Accesibilidad | `VideoCall.test.tsx` · `role="status"` y `aria-live` |
| 10. Aislamiento | `VideoCall.test.tsx` · SDK mockeado, sin `mediaDevices` |

---

## 7. Verificación Final

```bash
pnpm --filter frontend test
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

- Pestaña A: `http://localhost:5173/?incidentId=inc_demo`, rol "Inquilina".
- Pestaña B: misma URL, rol "Técnica".
- Comprobar mismo `sessionId`, vídeo local en ambas, vídeo remoto en ambas y
  estado "Conectada".
- Cerrar una pestaña y comprobar que la otra pasa a "Desconectada" y libera la
  cámara.

---

## 8. Fuera de este Plan

- No se abre PR, no se hace commit, no se mueve el issue ni se publica nada sin
  autorización explícita.
- No se implementa timeout, reconexión, toast ni envío de SMS.
- No se tocan las ramas ni PRs de mensajería.

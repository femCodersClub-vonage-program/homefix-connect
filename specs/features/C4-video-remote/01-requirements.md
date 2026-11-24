# 01 — Requirements · C4 · VideoCall: vídeo remoto + eventos

> **Issue:** [#20](https://github.com/femCodersClub-vonage-program/homefix-connect/issues/20)
> **Rama sugerida:** `feat/C4-video-remote` · **Size:** S
> **Fuente de alcance:** `docs/MVP_DEFINITION.md` · `docs/TASKS.md` §7 ·
> `frontend/AGENTS.md` §5 · issue #20
> **Estado:** requisitos cerrados el 2026-11-21. Pendiente de aprobar el plan
> técnico (`03-plan.md`) antes de implementar.

---

## 1. Resumen del Problema

C3 ya permite entrar a la sesión de Vonage, publicar cámara/micrófono y verse en
local, pero no suscribe a la otra persona. En la demo con dos participantes cada
una solo ve su propio vídeo, con lo que el caso de uso central del MVP —la
inquilina y la técnica se ven y se oyen— todavía no se cumple.

**Valor observable:** al entrar inquilina y técnica a la misma incidencia, cada
una ve el vídeo de la otra y la UI refleja cuándo el stream remoto aparece y
cuándo desaparece.

**Consumidores:** inquilina (`TENANT`) y técnica (`TECHNICIAN`). La gestora no
entra a la videollamada.

---

## 2. Casos de Uso Afectados

| Escenario | Relación con C4 |
|---|---|
| **1 — Inquilina entra** | C3 ya publica su vídeo local; C4 permite que la técnica lo reciba. |
| **2 — Técnica entra** | C4 suscribe al stream de la inquilina y hace que la inquilina vea el de la técnica. Es el escenario que cierra C4. |
| **3 — Fin de la videollamada → SMS** | C4 solo reacciona a `streamDestroyed`; no cierra la sesión en backend ni envía SMS (A4/B3). |
| **4 — Frontend avisa de que la visita terminó** | C4 muestra el estado "Desconectada"; el toast de C5 y el bloqueo del botón quedan fuera. |

---

## 3. Comportamiento Actual vs Esperado

### Hoy (tras C3)

- `useVideoCall` llama a `OT.initSession`, `session.connect`, `OT.initPublisher`
  y `session.publish`.
- Solo escucha `sessionDisconnected` y `connectionDestroyed`.
- `VideoCall` renderiza un único contenedor local; el SDK inserta el `<video>`
  local dentro de él.
- Estados internos: `idle | connecting | connected | error | ended`.
- Textos: "Preparando videollamada…", "Conectando…", "Conectada",
  "No se pudo iniciar la videollamada" y "Videollamada finalizada".
- No hay suscripción a streams remotos ni limpieza de subscribers.

### Esperado tras C4

- `session.on('streamCreated', ...)` suscribe al stream remoto con
  `session.subscribe(stream, ...)`.
- El vídeo remoto se renderiza en un elemento propio, separado del local.
- `session.on('streamDestroyed', ...)` llama a `session.unsubscribe(subscriber)`,
  limpia la referencia y muestra el estado de desconexión acordado.
- El cleanup de C3 se amplía para quitar también estos dos listeners y
  desuscribir cualquier subscriber pendiente.
- La UI mantiene `aria-live="polite"` para los cambios de estado.
- Los tests siguen mockeando el SDK: sin cámara, sin red y sin streams reales.

---

## 4. Fuera de Alcance

- Reconexión automática: ya decidida como fuera de MVP (I2).
- Toast "Visita finalizada" y bloqueo del botón (C5).
- Envío de SMS, cierre de sesión en backend y webhooks (A4/B3/X3).
- Refresco de token, login real, router, dashboard o estado global.
- Cambios en `backend/openapi.yaml`, `backend/prisma/schema.prisma` ni backend.
- Nuevas dependencias (el SDK Web ya está instalado en C3).
- Tests de contrato Pact ni E2E Playwright.
- Timeout visual de 30 s: diferido a I2/post-MVP; C4 muestra un placeholder
  mientras no hay stream remoto, sin temporizador.

---

## 5. Dependencias

### Hard

- **C3** · `useVideoCall` + `VideoCall` con vídeo local y cleanup. ✅ Mergeado en
  `main` (`5f72025`).

### Soft

- **C2** · `IncidentDetail` y el patrón de tests de página.
- Backend + seed + credenciales Vonage reales solo para la demo manual; los
  tests unitarios no las necesitan.

---

## 6. Clasificación de Requisitos

### Explícitos (issue #20)

- Suscribirse en `streamCreated` y renderizar el vídeo remoto.
- Limpiar el subscriber en `streamDestroyed` y mostrar estado "desconectado".
- Estados visuales: "Conectando...", "Conectada", "Desconectada", "Error".
- `aria-live` para cambios de estado y botones reales.
- Extender `useVideoCall` / `VideoCall`; unsubscribe en cleanup.
- Reconexión automática fuera de alcance.

### Derivados (scaffold / SDK / C3)

- El evento `streamCreated` del SDK incluye `event.stream` (`opentok.d.ts:632`).
- El evento `streamDestroyed` incluye `event.stream` y `event.reason`
  (`opentok.d.ts:636`).
- La limpieza del subscriber se hace con `session.unsubscribe(subscriber)`
  (`opentok.d.ts:708`); el tipo `Subscriber` no expone `destroy()` público.
- El cleanup existente es idempotente mediante la bandera `cleaned`; C4 debe
  reutilizarlo en lugar de crear un segundo mecanismo.
- No se añaden campos al contrato: `applicationId`, `sessionId` y `token` ya
  llegan como props de `VideoCall`.
- El layout previsto en C3 es local pequeño y remoto grande.

### Decisiones de Clarificación Acordadas

| Pregunta | Decisión | Justificación |
|---|---|---|
| Texto de desconexión | Mantener el valor interno `ended` y cambiar el texto a **"Desconectada"**. | Cumple el issue sin añadir un estado ni una transición nueva. |
| Alcance de `streamDestroyed` | unsubscribe del remoto + mismo cleanup que `connectionDestroyed`: se cierra toda la llamada. | En una sesión 1-a-1, si la otra persona se va, la visita terminó. Reutiliza el cleanup idempotente de C3. |
| Elemento del vídeo remoto | `<div ref={remoteRef}>` y `session.subscribe(stream, remoteRef.current)`. | Mismo patrón que el vídeo local; el SDK inserta el `<video>` y React no compite por ese nodo. |
| Timeout de 30 s | No en C4. Mientras no haya stream remoto se muestra "Esperando a la otra persona…" sin temporizador. | Es la opción mínima; el aviso temporal queda para I2/post-MVP. |
| Reconexión automática | Fuera de alcance. | Ya decidido en el issue y en `docs/MVP_DEFINITION.md` (I2). |

---

## 7. Datos Mínimos y Contrato

No hay nuevos datos de entrada ni de API. Los únicos datos nuevos en el flujo
son los que ya trae el evento del SDK:

| Dato | Origen | Uso |
|---|---|---|
| `stream` | `streamCreated` / `streamDestroyed` | Identificar el stream remoto para `subscribe` / `unsubscribe`. |
| `subscriber` | Retorno de `session.subscribe(...)` | Guardarlo en una referencia para limpiarlo. |

No se persisten streams, subscribers ni ids de conexión. No se registran tokens
ni session ids en logs.

---

## 8. Criterios de Aceptación (resumen)

1. Con dos participantes, cada uno ve el vídeo remoto del otro.
2. `streamCreated` llama a `session.subscribe` exactamente una vez por stream.
3. `streamDestroyed` llama a `session.unsubscribe` y deja la UI en el estado
   acordado.
4. Los listeners `streamCreated`/`streamDestroyed` se quitan en cleanup.
5. El estado sigue siendo accesible con `aria-live="polite"`.
6. No se subscribe al propio stream local.
7. Los tests no abren cámara ni hacen red real.
8. `pnpm check`, `pnpm test` y `pnpm build` en verde.

La especificación completa con Given/When/Then se redactará en
`02-specification.md` tras las respuestas del issue.

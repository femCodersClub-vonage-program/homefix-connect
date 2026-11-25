# 01 — Requirements · C8 · Botón "Colgar" en la videollamada

> **Issue:** [#57](https://github.com/femCodersClub-vonage-program/homefix-connect/issues/57) · **Rama sugerida:** `feat/C8-hangup-button` · **Size:** XS/S
> **Fuente de alcance:** `docs/MVP_DEFINITION.md` escenarios 3 y 4 · `docs/TASKS.md` · laguna detectada tras C5
> **Estado:** análisis y decisiones acordadas el 2026-11-24; issue publicado y plan aprobado el 2026-11-25; implementado en `feat/C8-hangup-button`.

---

## 1. Resumen del Problema

El MVP dice que, al colgar, se envían 2 SMS y la frontend muestra
"Visita finalizada". Hoy no existe ningún botón para colgar: `VideoCall` solo
muestra vídeo local/remoto y el estado; la desconexión ocurre al cerrar la
pestaña, perder red o que cuelgue la otra persona.

C5 añadió el toast cuando el backend marca `VIDEO_COMPLETED`, pero ese cambio
llega por polling desde la BD/webhook y **no corta** una llamada ya montada.
Falta la acción explícita del usuario dentro de la videollamada.

---

## 2. Casos de Uso Afectados

- `docs/MVP_DEFINITION.md` escenario 3: fin de videollamada → sesión `ENDED`,
  incidencia `VIDEO_COMPLETED` y 2 SMS.
- `docs/MVP_DEFINITION.md` escenario 4: la pantalla muestra "Visita finalizada"
  / "Visita realizada".
- Criterio del MVP: "Al colgar se envían 2 SMS reales".

---

## 3. Comportamiento Actual vs Esperado

### Actual

- `frontend/src/pages/IncidentDetail.tsx:141-154` monta `VideoCall` mientras
  exista el token; no hay prop ni acción de colgar.
- `frontend/src/components/VideoCall.tsx:14-20,37-66` no renderiza botones; el
  estado `ended` se traduce como "Desconectada".
- `frontend/src/hooks/useVideoCall.ts:83-128` ya tiene un `cleanup()` completo:
  quita listeners, desuscribe, unpublish, `publisher.destroy()` y
  `session.disconnect()`. No está expuesto al componente.
- `useVideoCall.ts:289-314` solo escucha eventos de Vonage para pasar a
  `ended`; el estado de la incidencia no desmonta ni cierra la sesión.
- El backend real de GitHub ya tiene `POST /api/webhooks/video-events` (A4) que
  atiende `sessionDestroyed`, marca `ENDED`/`VIDEO_COMPLETED` y llama a B3 para
  los 2 SMS. Ese checkout local está en la rama de C5 y no incluye aún A4/B3 en
  `main` local.

### Esperado (a confirmar)

- Botón real y accesible dentro de `VideoCall` que permita al usuario colgar.
- Al pulsarlo: limpieza segura del SDK, estado visible "Desconectada" y
  finalización del flujo sin dejar la UI colgada ni duplicar limpiezas.
- El toast de C5 y los SMS siguen dependiendo de que el backend marque
  `VIDEO_COMPLETED`; no deben dispararse solo por el clic local si el webhook
  todavía no llegó.

---

## 4. Fuera de Alcance (Out of Scope)

Propuesto, pendiente de confirmación:

- Añadir dependencias, librería de UI o estado global.
- Cambiar `backend/openapi.yaml`, `backend/prisma/schema.prisma`,
  `pnpm-lock.yaml` ni generar tipos.
- Forzar la salida del otro participante (`forceDisconnect`) ni convertir los
  tokens en `moderator`.
- Enviar SMS directamente desde el frontend.
- Cambiar el texto del toast de C5 ni la regla de `JoinButton`.
- Modificar C7 (cambio de cámara) dentro del mismo PR.

---

## 5. Dependencias

### Hard

- C3 y C4 ya implementados: `useVideoCall` y `VideoCall` con cleanup y vídeo
  remoto.
- SDK `@vonage/client-sdk-video@2.36.0` ya fijado; sin dependencias nuevas.
- Tests existentes `frontend/src/components/VideoCall.test.tsx` con SDK
  mockeado.
- Para que el valor de negocio completo funcione (SMS + estado global): A4
  (#10), B1/B2/B3 (#14) y X3, ya mergeados en el `main` real de GitHub.

### Soft

- Configuración del callback de Session Monitoring en el dashboard de Vonage
  apuntando a `/api/webhooks/video-events`, y `VONAGE_SIGNATURE_SECRET`.
- C5 (PR #51) para el toast; no bloquea el botón en sí.
- I1 (#23) para la validación E2E real con ngrok.

---

## 6. Clasificación de Requisitos

| Tipo | Requisito | Acción |
|---|---|---|
| Explícito | "Al colgar" dispara el cierre de la visión y los SMS (`AGENTS.md`, `MVP_DEFINITION.md`). | Documentar y validar. |
| Derivado | El botón debe reutilizar `cleanup()` porque ya hace toda la limpieza del SDK. | Documentar con justificación. |
| Derivado | El estado local debe ser `ended` / "Desconectada" porque C3/C4 ya definen ese estado. | Documentar con justificación. |
| Resuelto | ¿Colgar desconecta solo al usuario o finaliza la visita para todos de forma inmediata? | D-01: desconexión local; el cierre global sigue por webhook. |
| Resuelto | ¿Pueden colgar ambas partes o solo una? | D-02: ambas partes. |
| Resuelto | ¿Qué UI queda tras colgar: "Desconectada" o volver a `JoinButton`? | D-03: mantener `VideoCall` en "Desconectada". |
| Resuelto | ¿Numerar y publicar como C8? | D-04: numerar como C8 y publicar como #57. |

---

## 7. Decisiones de Clarificación Acordadas

| # | Decisión | Justificación |
|---|---|---|
| D-01 | "Colgar" desconecta solo al participante local. No finaliza la visita ni envía SMS en el clic. | A4 ya cierra la visita con `sessionDestroyed` cuando sale el último participante; evita un endpoint nuevo y cambios en `openapi.yaml`. |
| D-02 | Pueden colgar la inquilina y la técnica. | Los tokens actuales son `publisher` para ambos y el MVP es 1-a-1 sin jerarquía de moderación. |
| D-03 | Después de colgar, `VideoCall` permanece montado con el estado `ended` / "Desconectada". | C4 ya define ese estado y evita decidir reentrada a una sesión todavía `ACTIVE`. |
| D-04 | La tarea se numera como C8. Inicialmente quedó como borrador local y se publicó como [#57](https://github.com/femCodersClub-vonage-program/homefix-connect/issues/57) el 2026-11-25. | Carolina pidió primero "solo borrador local" y después autorizó crear el issue. |

### Consecuencias aceptadas

- La otra persona puede seguir en la sesión; la visita no se marca
  `VIDEO_COMPLETED` hasta que salga el último participante.
- El SMS y el toast de C5 pueden tardar en aparecer porque Vonage envía
  `sessionDestroyed` aproximadamente un minuto después del último desconecte.
- No se muestra ningún mensaje que afirme que las notificaciones ya se enviaron
  en el instante del clic local.

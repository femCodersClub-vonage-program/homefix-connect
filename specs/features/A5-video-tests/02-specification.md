# A5 · Tests de vídeo (unit + integración) — Especificación

> Issue: #11 · Rama: `test/A5-video` · Requisitos: `01-requirements.md` · Estado: borrador (Q1–Q6 propuestas, 24/11)

## 1. Resumen

Los unitarios del carril A ya existen. La A5 comprueba que **el carril de vídeo funciona con Postgres de verdad**: el repo de `VideoSession`, la entrada a la videollamada (`/video-tokens`) y el cierre por webhook (`/webhooks/video-events`) con el aviso post-visita.

Usa la capa de integración de la B5 (`pnpm --filter backend test:integration`, BD `homefix_test`).

## 2. Alcance

**Entra:**

- `backend/tests/integration/helpers/video.ts`: seed de incidencia `VISIT_ASSIGNED` + visita `CONFIRMED` + `VideoSession`, `VideoService` y `MessagingService` falsos, y `createVideoTestApp()` (app real con lo externo sustituido).
- `backend/tests/integration/video-session.repo.int.test.ts` (INT-V1 a INT-V4).
- `backend/tests/integration/video-tokens.int.test.ts` (INT-V5 a INT-V8).
- `backend/tests/integration/video-events.int.test.ts` (INT-V9 a INT-V13).

**No entra:** ver `01-requirements.md` §4.

## 3. Requisitos funcionales

| ID   | Requisito | Fuente |
| ---- | --------- | ------ |
| RF-1 | Los tests nuevos solo se ejecutan con `test:integration`; `pnpm test` no cambia | B5 · E-04 |
| RF-2 | Cada test parte de una BD vacía (`resetDatabase`) y crea sus datos | E-07 |
| RF-3 | Nada sale a Vonage: `VideoService` y `MessagingService` son falsos | Q4 |
| RF-4 | Los webhooks van firmados como los de Vonage (HS256 + `payload_hash`) con un secreto de test | X3 · Q4 |
| RF-5 | No se modifica nada de `src/` ni la infraestructura de la B5 | Q5 · E-06 |

## 4. Casos

| ID | Caso | Resultado esperado |
| -- | ---- | ------------------ |
| INT-V1 | `findByVisitId` | Devuelve la sesión de la visita; `null` si no existe |
| INT-V2 | `findByVonageSessionId` | Incluye `visit` con su `incidentId`; `null` si no existe |
| INT-V3 | `update` parcial | Guarda solo los campos pasados (`vonageSessionId`, luego `status` + `startedAt`); `endedAt` sigue `null` |
| INT-V4 | `update` de un id inexistente | Lanza error y no crea filas |
| INT-V5 | Primera entrada (inquilina) | 200 con `{ applicationId, sessionId, token }`; `createSession(visitId)` una vez; en BD `vonageSessionId` guardado, `ACTIVE`, `startedAt` |
| INT-V6 | Entra la técnica después | 200 con la misma `sessionId`; no se crea otra sala; `startedAt` no cambia |
| INT-V7 | Dos peticiones a la vez | Las dos 200 con la misma `sessionId`; una sola sala; BD con ese id |
| INT-V8 | Sesión `ENDED` | 409; no se llama a Vonage |
| INT-V9 | `sessionDestroyed` | 200 `processed`; sesión `ENDED` + `endedAt`; incidencia `VIDEO_COMPLETED`; 2 SMS; 2 `Notification` `QUEUED` (gestora e inquilina) |
| INT-V10 | El mismo evento dos veces | La segunda: 200 `already_processed`; sin SMS ni filas nuevas; `endedAt` no cambia |
| INT-V11 | `sessionId` desconocido | 400; la BD no cambia; sin SMS |
| INT-V12 | Fallan los SMS | 200; visita cerrada igual; 2 `Notification` `FAILED` con `error = VonageNetworkError` |
| INT-V13 | Flujo completo | Tokens de inquilina y técnica (misma sala) → `sessionDestroyed` → `processed` → la inquilina ya no puede entrar (409); estado final en BD correcto |

## 5. Criterios de aceptación

- **CA-1** · `pnpm test` sigue igual (124 en la rama, sin Docker).
- **CA-2** · `pnpm --filter backend test:integration` pasa: 8 de la B5 + 13 de la A5.
- **CA-3** · Repetible: dos ejecuciones seguidas en verde.
- **CA-4** · Los tests detectan fallos reales: si se quita la comprobación de idempotencia del webhook, INT-V10 falla.
- **CA-5** · `pnpm check` en verde.

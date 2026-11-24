# A4 · Webhook de fin de videollamada (`POST /api/webhooks/video-events`) — Requisitos

> Issue: #10 · Rama: `feat/A4-video-webhook` (sale de `feat/B3-notifications`, PR #47) · Depende de: A2, A3, X1, X3, B2 (#44 ✅), B3 (#47)

## 1. Requisitos clasificados

### Explícitos (issue #10 + `docs/`)

| ID   | Requisito | Fuente |
| ---- | --------- | ------ |
| E-01 | Endpoint `POST /api/webhooks/video-events` montado en `app.ts` | Issue #10 |
| E-02 | Protegido con `verifyVonageSignature()` (X3) antes de procesar | Issue #10 · `ARCHITECTURE.md` §5 |
| E-03 | Del evento de fin de sesión se saca el id de sesión de Vonage y se busca la `VideoSession` por `vonageSessionId` | Issue #10 |
| E-04 | Si la sesión no existe → **400** | Refinamiento del #10 (PR #34) · `TASKS.md` (A4) |
| E-05 | Idempotente: si la sesión ya está `ENDED` o la incidencia ya está `VIDEO_COMPLETED` → no-op | Refinamiento del #10 · `TASKS.md` §«Replay fuera de alcance» |
| E-06 | `VideoSession.status = ENDED` y `endedAt = now()` | Issue #10 |
| E-07 | `Incident.status = VIDEO_COMPLETED` | Issue #10 · `ARCHITECTURE.md` (diagrama) |
| E-08 | Llama a `sendPostVisit(incidentId, technicianName)`; los 2 SMS se envían una sola vez | Issue #10 · `TASKS.md` (A4) |
| E-09 | Responde 200 (Vonage no reintenta con 2xx) | Issue #10 |
| E-10 | SMS síncronos en la misma petición; si Vonage falla → `FAILED`, sin reintento | ADR-012 |
| E-11 | Test de integración con Supertest | Issue #10 |

### Derivados

| ID   | Requisito | Justificación |
| ---- | --------- | ------------- |
| D-01 | Router `createVideoEventsRouter(deps)` en `src/routes/video-events.ts`, con dependencias inyectadas | Mismo patrón que `createVideoTokensRouter` (A3) |
| D-02 | `AppDeps` admite `postVisitNotifier`; por defecto `MessagingPostVisitNotifier` con `createVonageMessagesClient` + `PrismaNotificationRepo` | Los tests inyectan stubs (como en A3); conecta B1 + B2 + B3 |
| D-03 | No hace falta `express.raw`: `app.ts` ya guarda el cuerpo original en `req.rawBody` (`captureRawBody`) y la X3 lo usa | Revisión de `app.ts` y `verifyVonageSignature.ts` |
| D-04 | Eventos que no son de fin de sesión → 200 sin efectos | Vonage manda todos los eventos de la sesión a la misma URL (ver §2) |
| D-05 | Sin cambios en `schema.prisma`; los repos de X1 ya tienen lo necesario (`findByVonageSessionId` con `visit`, `update`, `updateStatus`) | Revisión de los repos |
| D-06 | Logs sin teléfonos ni texto del SMS; solo ids, evento y motivo | `ARCHITECTURE.md` §5 · igual que B2/B3 |

## 2. Hallazgos al revisar el repo y la documentación de Vonage (23/11)

- **No existe un evento llamado `session.end` en Vonage Video.** Los callbacks de *Session Monitoring* llegan todos a la misma URL con un campo `event`: `connectionCreated`, `connectionDestroyed`, `streamCreated`, `streamDestroyed`, `sessionCreated` y `sessionDestroyed`. El equivalente a «fin de la visita» es **`sessionDestroyed`**. (Fuente: guía «Session Monitoring» de developer.vonage.com, consultada el 23/11; conviene confirmarlo en la sesión con Vonage.)
- **`sessionDestroyed` no llega al colgar, sino ~1 minuto después** de que se desconecte la última persona. También llega si la sesión caduca (8 h) o si cae un servidor de Vonage. El payload trae `sessionId`, `projectId`, `event`, `timestamp`, `createdAt` y `reason` (`clientDisconnected`, `forceDisconnected`, `mediaIdle`, `serverRotation`).
- El campo del id es **`sessionId`** (camelCase), no `session_id` como dice el issue.
- La guía dice que los callbacks se pueden firmar con *signature secret*, pero no detalla el mecanismo; la X3 ya verifica JWT HS256 con `payload_hash`. Pendiente comprobar con un callback real que Video firma igual que Messages.
- Vonage reintenta con *backoff* si el endpoint falla; la guía no fija el código esperado.
- `openapi.yaml` **no tiene ningún webhook** (el contrato es frontend ↔ backend).
- `docs/MVP_DEFINITION.md` y `TASKS.md` §resultado dicen «al colgar… el frontend muestra "Visita finalizada"»: con `sessionDestroyed` habrá ~1 min de retraso (afecta a la C5).
- Contradicción en el propio issue: el criterio inicial dice **404** si no existe la sesión y el refinamiento dice **400**.
- El criterio del issue dice «Notification queda QUEUED» si falla `sendPostVisit`; con la B3 queda `FAILED` (ADR-012) y `sendPostVisit` no lanza por un SMS fallido.

## 3. Decisiones de Clarificación Acordadas

| #  | Pregunta | Decisión |
| -- | -------- | --------- |
| Q1 | ¿Qué evento cierra la visita? | **Solo `sessionDestroyed`** (cualquier `reason`). El resto de eventos → 200 sin efectos |
| Q2 | Sesión desconocida (`sessionId` sin `VideoSession`): ¿400, 404 o 200? | **400** como dice el refinamiento y `TASKS.md` (Vonage reintentará; es un caso que no debería pasar en la demo) |
| Q3 | ¿Qué pasa si `sendPostVisit` lanza (incidencia no existe o falla la BD)? | Log `error` y **200**: la sesión y la incidencia ya quedaron cerradas y un reintento de Vonage no reenviaría nada (no-op por E-05) |
| Q4 | Orden: ¿cerrar sesión/incidencia antes o después de enviar los SMS? | **Antes**: `ENDED` + `VIDEO_COMPLETED` y luego `sendPostVisit` (la B3 ya evita reenvíos) |
| Q5 | `technicianName` | Pasar **`''`**: `sendPostVisit` usa el nombre de la técnica de la incidencia (Q2 de la B2) |
| Q6 | ¿Se marca también `Visit.status = COMPLETED`? | **No** en el MVP (no hay `VisitRepo` y el issue no lo pide). Se anota como pendiente |
| Q7 | Test de integración: ¿BD real o stubs en memoria? | **Stubs en memoria + Supertest** (como A3), con firma real (helper `vonageJwt.ts`). La BD real queda para I1/A5 |
| Q8 | ¿Se añade el webhook a `openapi.yaml`? | **No**: no lo consume el frontend; se documenta en la spec |
| Q9 | Retraso de ~1 min hasta `sessionDestroyed` (C5 «Visita finalizada») | Aceptarlo en el MVP y avisar a Miranda en el sync |

Acordadas por Carolina el 23/11 (propuesta tal cual). Pendiente: publicarlas en el #10.

## 4. Fuera de alcance

- Webhook `message.status` y paso a `DELIVERED` (B4, post-MVP).
- Reintentos de SMS (ADR-012).
- Validación de replay (`iat`/`exp`/`jti`) y rate limiting (I2).
- Marcar `Visit` como `COMPLETED` (Q6).
- Configurar la URL del callback en el panel de Vonage y probar con ngrok (I1).
- Toast «Visita finalizada» en el frontend (C5).

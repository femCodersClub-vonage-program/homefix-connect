# A4 · Webhook de fin de videollamada (`POST /api/webhooks/video-events`) — Especificación

> Issue: #10 · Rama: `feat/A4-video-webhook` · Requisitos: `01-requirements.md` · Estado: borrador (Q1–Q9 acordadas, 23/11)

## 1. Resumen y contexto

Vonage Video avisa al backend de lo que pasa en cada sesión (*Session Monitoring*). Cuando llega **`sessionDestroyed`** (~1 min después de que cuelgue la última persona), la A4 cierra la visita:

1. `VideoSession` → `ENDED` + `endedAt`.
2. `Incident` → `VIDEO_COMPLETED`.
3. `sendPostVisit` (B2 + B3) → 2 SMS y sus `Notification`.

Un mismo `sessionDestroyed` repetido no hace nada la segunda vez.

## 2. Alcance

**Entra:**

- `src/routes/video-events.ts`: `createVideoEventsRouter(deps)` con `POST /webhooks/video-events`.
- Montarlo en `app.ts` bajo `/api`, con `verifyVonageSignature()` (X3) delante.
- `AppDeps` admite `postVisitNotifier` y `getSignatureSecret`; por defecto, notifier real (`createVonageMessagesClient` + `PrismaIncidentRepo` + `PrismaNotificationRepo`) y secreto de `env`.
- Tests con Supertest y stubs en memoria, firmando con el helper `vonageJwt.ts`.

**No entra:** ver `01-requirements.md` §4 (B4, reintentos, replay, `Visit.COMPLETED`, ngrok/panel de Vonage, C5).

## 3. Requisitos funcionales

| ID    | Requisito | Fuente |
| ----- | --------- | ------ |
| RF-1  | `POST /api/webhooks/video-events` pasa primero por `verifyVonageSignature()`: sin firma válida → 401 sin procesar nada | E-02 |
| RF-2  | Cuerpo sin `event` (string) → 400 | Validación de entrada |
| RF-3  | `event` distinto de `sessionDestroyed` → 200 `{ status: 'ignored' }` sin efectos | Q1 · D-04 |
| RF-4  | `sessionDestroyed` sin `sessionId` → 400 | E-03 |
| RF-5  | `sessionId` sin `VideoSession` → 400 | E-04 · Q2 |
| RF-6  | `VideoSession` ya `ENDED` **o** incidencia ya `VIDEO_COMPLETED` → 200 `{ status: 'already_processed' }` sin efectos | E-05 |
| RF-7  | Si no: `VideoSession` → `ENDED` con `endedAt = now()` e `Incident` → `VIDEO_COMPLETED`, en ese orden | E-06 · E-07 · Q4 |
| RF-8  | Después llama a `sendPostVisit(incidentId, '')` | E-08 · Q4 · Q5 |
| RF-9  | Si `sendPostVisit` lanza → log `error` y 200 igualmente | Q3 |
| RF-10 | Respuesta normal: 200 `{ status: 'processed' }` | E-09 |
| RF-11 | Logs con `event`, `sessionId`, `incidentId`, `reason` y resumen del envío (nº enviados/fallidos/omitidos); sin teléfonos ni texto | D-06 |
| RF-12 | Sin cambios en `schema.prisma` ni `openapi.yaml` | D-05 · Q8 |

## 4. Reglas de negocio

- **Evento de cierre:** solo `sessionDestroyed`, sea cual sea el `reason` (Q1). Si la sesión caduca o cae un servidor, también se cierra la visita.
- **Idempotencia:** por estado (`ENDED` / `VIDEO_COMPLETED`) antes de tocar nada; y la B3 evita reenviar SMS aunque se llegara a llamar dos veces a `sendPostVisit`.
- **Orden:** primero estados, después SMS (Q4). Si los SMS fallan, la visita queda cerrada igual.
- **Técnica:** se pasa `''`; `sendPostVisit` usa `incident.technician.name` (Q5).
- **Dos `sessionDestroyed` simultáneos:** pueden pasar los dos la comprobación; la B3 reduce el riesgo, pero no lo elimina (Q6 de la B3, aceptado).

## 5. Contrato

**Petición (la manda Vonage):**

```http
POST /api/webhooks/video-events
Authorization: Bearer <JWT HS256 con payload_hash>
Content-Type: application/json

{
  "sessionId": "2_MX4xMzExMjU3MX5-...",
  "projectId": "123456",
  "event": "sessionDestroyed",
  "reason": "clientDisconnected",
  "timestamp": 1470258896953
}
```

Solo se usan `event` y `sessionId`; el resto se ignora (también en otros eventos, que traen `connection` / `stream`).

**Respuestas:**

| Caso | Código | Cuerpo |
| ---- | ------ | ------ |
| Firma inválida o ausente | 401 | `{ error: 'Invalid signature' }` (X3) |
| Secreto no configurado | 500 | `{ error: 'Webhook signature secret not configured' }` (X3) |
| Sin `event` / `sessionDestroyed` sin `sessionId` | 400 | `{ error: 'Invalid payload' }` |
| Sesión desconocida | 400 | `{ error: 'Unknown session' }` |
| Otro evento | 200 | `{ status: 'ignored' }` |
| Ya procesado | 200 | `{ status: 'already_processed' }` |
| Procesado (aunque fallen SMS o `sendPostVisit`) | 200 | `{ status: 'processed' }` |
| Error de BD al cerrar estados | 500 | `errorHandler` de `app.ts` (Vonage reintentará) |

**Código:**

```ts
// src/routes/video-events.ts
export type VideoEventsDeps = {
  incidentRepo: IncidentRepo;
  videoSessionRepo: VideoSessionRepo;
  postVisitNotifier: PostVisitNotifier;
  getSignatureSecret?: () => string | undefined; // por defecto, env (X3)
};
export function createVideoEventsRouter(deps: VideoEventsDeps): Router;

// src/app.ts
export type AppDeps = {
  // …lo que ya hay
  postVisitNotifier?: PostVisitNotifier;          // A4
  getSignatureSecret?: () => string | undefined;  // A4 (tests)
};
```

## 6. Manejo de errores

| Caso | Qué pasa |
| ---- | -------- |
| `videoSessionRepo` / `incidentRepo` fallan al cerrar | `next(err)` → 500; Vonage reintenta y, como no se llegó a `ENDED`, se vuelve a procesar |
| Falla `incidentRepo.updateStatus` después de `ENDED` | 500; el reintento verá `ENDED` → `already_processed` y la incidencia quedaría sin `VIDEO_COMPLETED`. Riesgo aceptado (BD local); se anota |
| `sendPostVisit` lanza | Log `error` + 200 `processed` (Q3) |
| Un SMS falla | Lo gestiona la B3 (`FAILED`); 200 `processed` |
| `VideoSession` sin `visit` (no debería pasar) | 400 `Unknown session` + log `warn` |

## 7. Casos límite

| Caso | Qué pasa |
| ---- | -------- |
| `connectionDestroyed` de una persona (la otra sigue) | 200 `ignored` |
| `sessionDestroyed` con `reason = mediaIdle` / `forceDisconnected` | Se procesa igual (Q1) |
| Sesión `PENDING` (nadie pidió token, pero existe el id) | Se procesa: pasa a `ENDED` |
| `sessionDestroyed` repetido | `already_processed`, sin SMS |
| Incidencia ya `VIDEO_COMPLETED` pero sesión no `ENDED` | `already_processed` (E-05), sin tocar nada |

## 8. Criterios de aceptación

- [ ] **CA-1 · Firma:** sin `Authorization` o con firma inválida → 401 y no se toca nada ni se llama a `sendPostVisit`.
- [ ] **CA-2 · Evento ignorado:** `connectionDestroyed` firmado → 200 `ignored`, sin cambios.
- [ ] **CA-3 · Payload inválido:** sin `event`, o `sessionDestroyed` sin `sessionId` → 400.
- [ ] **CA-4 · Sesión desconocida:** → 400 `Unknown session`, sin llamar a `sendPostVisit`.
- [ ] **CA-5 · Cierre correcto:** `sessionDestroyed` de una sesión `ACTIVE` → 200 `processed`; sesión `ENDED` con `endedAt`, incidencia `VIDEO_COMPLETED` y `sendPostVisit(incidentId, '')` llamado 1 vez.
- [ ] **CA-6 · Idempotencia:** el mismo `sessionDestroyed` dos veces → la segunda da `already_processed` y `sendPostVisit` se llama 1 vez en total.
- [ ] **CA-7 · Incidencia ya completada:** → `already_processed`, sin cambios ni SMS.
- [ ] **CA-8 · `sendPostVisit` falla:** → 200 `processed`, estados cerrados y log `error`.
- [ ] **CA-9 · Logs:** sin teléfonos ni texto del SMS.
- [ ] **CA-10 · Sin regresiones:** `pnpm check` y `pnpm test` en verde (incluidos A3, X3, B2, B3).

## 9. Diseño técnico

- **Nuevo** `src/routes/video-events.ts` (patrón de `video-tokens.ts`, con `zod` para el cuerpo).
- **Cambia** `src/app.ts`: crear el notifier por defecto y montar `createVideoEventsRouter` bajo `/api`.
- **Nuevo** `src/__tests__/video-events.test.ts`: Supertest + `InMemoryIncidentRepo` + `InMemoryVideoSessionRepo` + notifier falso (`vi.fn()`), firmando con `signVonageJwt` y `TEST_SECRET`.
- **No** se toca `schema.prisma`, `openapi.yaml` ni los repos.

## 10. Decisiones (Q1–Q9)

Acordadas el 23/11/2026 (ver `01-requirements.md` §3). Pendiente de publicar en el #10.

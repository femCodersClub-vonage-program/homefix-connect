# E1-01 · Contrato y schema del ciclo de visita — Especificación

> Issue: #67 · Rama: `spec/E1-01-visit-lifecycle` · Requisitos: `01-requirements.md` (Q1–Q4 acordadas, 25/11)

## 1. Qué entra en el PR

| Archivo | Cambio |
| ------- | ------ |
| `backend/openapi.yaml` | 5 rutas nuevas + schemas + `completedAt` opcional en `Incident.visit` |
| `backend/prisma/schema.prisma` | `Visit.completedAt`, `Notification.deliveredAt`, 2 uniques |
| `frontend/src/api/generated/openapi.d.ts` | Regenerado con `pnpm gen:types` (no se edita a mano) |
| Dobles de prueba (`InMemoryNotificationRepo` + fixtures de 6 tests) | `completedAt: null` / `deliveredAt: null` para que compilen con los tipos nuevos de Prisma. Sin cambios de comportamiento |

**No entra:** ningún endpoint implementado. Hasta que se haga cada issue, esas rutas responden el 404 genérico.

## 2. Contrato (`openapi.yaml`)

Todas las rutas de incidencia llevan `X-User-Id` + `X-User-Role` **obligatorias** (parámetros reutilizables `UserId` / `UserRole`). Los webhooks llevan `security: VonageSignature` (JWT HS256 de X3).

| Ruta | Implementa | 200 | Errores |
| ---- | ---------- | --- | ------- |
| `POST /api/incidents/{id}/visit-status` | E1-02 | `VisitStatusResponse` `{ status: completed \| not_completed \| unchanged, notifications? }` | 400 · 403 · 404 · 409 · 500 |
| `POST /api/incidents/{id}/close` | E3-02 | `CloseIncidentResponse` `{ status: closed \| already_closed }` | 400 · 403 · 404 · 409 · 500 |
| `GET /api/incidents/{id}/notifications` | E3-01 | `NotificationList` `{ notifications: Notification[] }` | 400 · 403 · 404 · 500 |
| `POST /api/webhooks/video-events` | A4 (ya existe) · E0-02 · E1-04 | `WebhookAck` `{ status: processed \| already_processed \| ignored }` | 400 · 401 · 500 |
| `POST /api/webhooks/message-status` | E2-01 | `WebhookAck` | 400 · 401 · 500 |

Schemas nuevos:

- `VisitStatusRequest`: `{ status: COMPLETED | CANCELLED }` (sin enums nuevos: D4/D5).
- `NotificationSummary`: `{ sent, failed, skipped }` enteros ≥ 0 (Q3). Solo se devuelve al pasar a `COMPLETED`.
- `Notification`: `id`, `recipient { id, name, role }`, `channel: SMS`, `status`, `template`, `sentAt`, `deliveredAt`, `error`. **Sin teléfonos ni emails.**
- `VideoEvent` y `MessageStatusEvent`: solo los campos que usa el backend; `additionalProperties: true` porque Vonage manda más.
- `Incident.visit.completedAt`: `string | null`, **opcional** (Q4). No rompe el cliente ni el test de forma de `GET /incidents/:id`.

## 3. Schema (`schema.prisma`)

| Cambio | Para qué | Nota |
| ------ | -------- | ---- |
| `Visit.completedAt DateTime?` | Cuándo se completó (gestora) | Null si no está `COMPLETED` |
| `Notification.deliveredAt DateTime?` | Separar enviado (`sentAt`) de entregado (B4) | — |
| `Notification.providerMessageId @unique` | Un `message_uuid` = una notificación (B4 busca por él) | Equivale a `@@unique([providerMessageId])`; los `NULL` no chocan |
| `@@unique([incidentId, template, recipientId])` | Idempotencia por destinataria (E4-02 trata P2002 como `ALREADY_SENT`) | Ver §4 |

## 4. Riesgos

- **Base de datos local con datos:** `prisma db push` avisa al añadir uniques sobre tablas con filas y, sin terminal interactiva, puede pararse. Solución: `pnpm db:reset` (borra y vuelve a sembrar). Afecta también a la base de tests local (`homefix_test`) si tiene filas.
- El contrato describe ya el comportamiento de E0-02 en `video-events` (sesión desconocida → `ignored`); hasta que se mergee la E0-02, el backend sigue devolviendo 400 en ese caso.

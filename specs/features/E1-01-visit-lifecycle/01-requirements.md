# E1-01 · Contrato y schema del ciclo de visita — Requisitos

> Issue: #67 · Asignada a Caro-it (25/11) · Rama: `spec/E1-01-visit-lifecycle` · Depende de: ninguna · **Bloquea** E1-02, E2-01/E2-02, E3-01/E3-02, E4-02
> Base: `docs/MVP_EXTENDED.md` §2 (D1–D13), §3.5, §7.1–§7.3

PR `spec/`: solo `backend/openapi.yaml`, `backend/prisma/schema.prisma` y `frontend/src/api/generated/openapi.d.ts` (regenerado). **Sin código de endpoints**: cada endpoint lo implementa su issue.

## 1. Requisitos

### Explícitos (issue #67 + `MVP_EXTENDED.md`)

| ID | Requisito | Fuente |
| -- | --------- | ------ |
| E-01 | OpenAPI: `POST /api/incidents/{id}/visit-status` | #67 · §7.1 |
| E-02 | OpenAPI: `POST /api/incidents/{id}/close` | #67 · §7.1 |
| E-03 | OpenAPI: `GET /api/incidents/{id}/notifications` | #67 · §7.1 |
| E-04 | OpenAPI: `POST /api/webhooks/message-status` | #67 · §7.1 |
| E-05 | Schema: `Visit.completedAt DateTime?` | #67 · §7.3 |
| E-06 | Schema: `Notification.deliveredAt DateTime?` | #67 · §7.3 |
| E-07 | Schema: `@@unique([incidentId, template, recipientId])` en `Notification` | #67 · §7.3 |
| E-08 | Schema: `@@unique([providerMessageId])` en `Notification` | #67 · §7.3 |
| E-09 | Regenerar `openapi.d.ts` (`pnpm gen:types`) en el mismo PR | #67 |
| E-10 | 1 approval de otra persona antes del merge | #67 · AGENTS §2.9 |
| E-11 | Sin enums nuevos: «Agendada» = `CONFIRMED`, «No completada» = `CANCELLED` | D4 · D5 |
| E-12 | Errores `{ error }` con 400/401/403/404/409/500 según endpoint | #67 · AGENTS §11 |

### Derivados

| ID | Requisito | Justificación |
| -- | --------- | ------------- |
| D-01 | `X-User-Id` + `X-User-Role` obligatorias en los 3 endpoints de incidencia; sin ellas o mal formadas → **400** (como `POST /video-tokens`) | Login simulado (ADR) · coherencia con A3 |
| D-02 | Los webhooks llevan `401` (firma X3) y `500` (secreto no configurado o error de BD) | X3 · §4.4 |
| D-03 | `Notification` como schema del contrato **sin teléfonos ni emails** | §7.1 · B3 |
| D-04 | La unique `[incidentId, template, recipientId]` puede chocar con datos locales duplicados → documentar `pnpm db:reset` antes de `db:push` | §10 riesgos |
| D-05 | `providerMessageId` es nullable: Postgres admite varios `NULL` en una unique, así que las `Notification` `FAILED` sin id no chocan | §7.3 |
| D-06 | `deliveredAt` y `completedAt` son opcionales: no rompen las filas que ya existen | `prisma db push` sin migraciones |

## 2. Preguntas de clarificación

| # | Pregunta | Opciones | Propuesta |
| - | -------- | -------- | --------- |
| Q1 | ¿Se añade también `POST /api/webhooks/video-events` (A4) al contrato? | A) Sí, aquí · B) En la E0-02 | **A**: §7.2 lo pide en este PR y así E0-02 no toca `openapi.yaml` |
| Q2 | El 429 de `POST /video-tokens` y el 401/403 de `GET /incidents/:id` (§7.2), ¿van aquí o en su issue? | A) Aquí · B) En E0-04 y E0-05 | **B**: sus issues piden actualizar el contrato en su PR; así este PR solo trae lo nuevo |
| Q3 | Forma de `notifications` en la respuesta de `visit-status` (§7.1 no la define) | A) `{ sent, failed, skipped }` como números · B) La lista completa | **A**: es el resumen que ya devuelve `sendPostVisit` |
| Q4 | ¿`GET /incidents/:id` expone `visit.completedAt`? | A) Sí, opcional · B) No, solo `notifications` y la vista de gestora | **A** (opcional, no `required`): la gestora lo necesita (§7.3) y no rompe el cliente actual |

## 3. Fuera de alcance

- Implementar los endpoints (E1-02, E2-01, E3-01, E3-02).
- Lógica de idempotencia por destinataria (E4-02): aquí solo la unique.
- Rate limit (E0-04) y cabeceras obligatorias en `GET /incidents/:id` (E0-05).
- Modelo de informe, reintentos de SMS, login real.

## 4. Decisiones de clarificación acordadas

_Pendiente de respuesta._

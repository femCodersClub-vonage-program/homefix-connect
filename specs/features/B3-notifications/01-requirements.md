# B3 · Registros `Notification` + idempotencia del aviso post-visita — Requisitos

> Issue: #14 (confirmar) · Rama: `feat/B3-notifications` · Depende de: B2 (#13, PR #44), X1 (interfaces y stubs)

## 1. Requisitos clasificados

### Explícitos (`docs/`)

| ID   | Requisito | Fuente |
| ---- | --------- | ------ |
| E-01 | `sendPostVisit` + registros `Notification` | `docs/TASKS.md` §6 (B3) |
| E-02 | Se crean 2 `Notification` por visita (gestora e inquilina) | `docs/ARCHITECTURE.md` (diagrama: «2 Notification en QUEUED») |
| E-03 | Las `Notification` se quedan en `QUEUED`; el webhook `message.status` es post-MVP (B4) | `docs/TASKS.md` §11 «Entrega de SMS (post-MVP)» |
| E-04 | Sin reintento automático: si Vonage falla, se registra `FAILED` | `docs/ARCHITECTURE.md` ADR-012 |
| E-05 | Un `session.end` repetido no reenvía los SMS | `docs/TASKS.md` §11 «Replay fuera de alcance» (A4 idempotente) |
| E-06 | `template = "post_visit"` en cada registro | `schema.prisma` (comentario del campo `template`) |

### Derivados

| ID   | Requisito | Justificación |
| ---- | --------- | ------------- |
| D-01 | Interface `NotificationRepo` + stub en memoria + implementación Prisma | Mismo patrón que X1 (`IncidentRepo`, `VideoSessionRepo`); permite testear sin Postgres |
| D-02 | `MessagingPostVisitNotifier` recibe también `notificationRepo` | Es quien conoce el resultado de cada SMS (B2) |
| D-03 | SMS enviado → `Notification` con `status = QUEUED`, `providerMessageId` y `sentAt` | E-03 + `PostVisitResult.sent` de la B2 |
| D-04 | SMS fallido → `Notification` con `status = FAILED` y `error` (nombre del error, sin teléfono ni texto) | E-04 + `PostVisitResult.failed` de la B2 · logs/datos sin datos personales |
| D-05 | Sin gestora → no se crea `Notification` para ella (sigue en `skipped`) | Decisión de la B2 (solo inquilina) |
| D-06 | Si ya existe alguna `Notification` `post_visit` para la incidencia → no se envía nada y se devuelve `skipped: ALREADY_SENT` | E-05 |
| D-07 | Sin cambios en `openapi.yaml` ni en `schema.prisma` | El modelo `Notification` ya existe |

## 2. Hallazgos al revisar el repo (21/11)

- El modelo `Notification` y los enums `NotificationChannel` / `NotificationStatus` ya están en `schema.prisma`; no hay repo, interface ni stub.
- En el PR de la B2 (#44) se escribió «B3 = `Notification` + idempotencia + reintentos», pero el ADR-012 dice que no hay reintento automático. Se sigue el ADR (Q1).
- `docs/ARCHITECTURE.md` §7 deja «Reintentos de SMS y fallback» para B3/B5 e «Idempotencia de webhooks» para A4/B4. La idempotencia del envío se resuelve aquí (Q5) para que la A4 solo tenga que llamar a `sendPostVisit`.
- El modelo no tiene `visitId`: la clave de idempotencia es `incidentId` + `template` (datos mínimos).

## 3. Decisiones de Clarificación Acordadas

| #  | Pregunta | Decisión |
| -- | -------- | -------- |
| Q1 | ¿Reintentos si falla el SMS? | **No.** Se registra `FAILED` (ADR-012) |
| Q2 | Estado tras un envío correcto | **`QUEUED`** + `providerMessageId` + `sentAt` |
| Q3 | ¿Cómo se detecta «ya enviado»? | Existe alguna `Notification` con `template = "post_visit"` para esa `incidentId` → `skipped: ALREADY_SENT`, sin enviar |
| Q4 | ¿Un `session.end` repetido reenvía un SMS que falló? | **No.** Si hay cualquier registro, no se envía nada (coherente con Q1) |
| Q5 | ¿La idempotencia va en la B3 o en la A4? | **En la B3**, dentro de `sendPostVisit` |
| Q6 | Dos `session.end` simultáneos | **Riesgo aceptado en el MVP** (evitarlo exige una restricción única en `schema.prisma`); se anota como pendiente |

Acordadas por Carolina el 21/11. Pendiente: publicarlas en el issue.

## 4. Fuera de alcance

- Reintentos automáticos y fallback (ADR-012).
- Webhook `message.status` y paso a `DELIVERED` (B4, post-MVP).
- Conectar `sendPostVisit` al webhook `session.end` (A4).
- Restricción única contra envíos simultáneos (Q6).
- Contract tests (B5).

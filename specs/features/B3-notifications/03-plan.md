# B3 · Registros `Notification` + idempotencia del aviso post-visita — Plan de implementación

> Spec: [`02-specification.md`](./02-specification.md) · Issue: #14 · Rama: `feat/B3-notifications` (ya sobre `main` con la B2 mergeada, #44) · Estado: borrador, pendiente de aprobación

## 1. Ficheros afectados

| Etiqueta   | Fichero | Qué y por qué |
| ---------- | ------- | ------------- |
| `[NEW]`    | `backend/src/repositories/notification.repo.ts` | `NotificationCreate`, interface `NotificationRepo` (`existsForIncident`, `create`) e `InMemoryNotificationRepo` (mismo patrón que `video-session.repo.ts`) |
| `[NEW]`    | `backend/src/repositories/prisma-notification.repo.ts` | `PrismaNotificationRepo`: `count({ where: { incidentId, template } }) > 0` y `create({ data })` |
| `[MODIFY]` | `backend/src/services/messaging.service.ts` | `POST_VISIT_TEMPLATE_ID`, `PostVisitSkipReason`, `skipped` ampliado, `notificationRepo` en las options, comprobación `ALREADY_SENT` y un `create` en cada rama del `try/catch` |
| `[MODIFY]` | `backend/src/__tests__/post-visit.test.ts` | El helper que crea el notifier pasa un `InMemoryNotificationRepo` vacío (los 17 tests de la B2 no cambian) + casos nuevos CA-1 a CA-8 |
| `[NEW]`    | `backend/src/__tests__/notification.repo.test.ts` | CA-9 (`existsForIncident` y `create` del repo en memoria) |
| `[MODIFY]` | `specs/features/B3-notifications/01-requirements.md` y `02-specification.md` | Quitar «stacked sobre `feat/B2-send-sms`» (la B2 ya está en `main`) |

Sin cambios en `app.ts`, `openapi.yaml`, `schema.prisma`, `VonageMessagesClient` ni `MessagingService`.

> Nota: en `messaging.service.ts` el comentario de la B2 «los reintentos son de la B3» se cambia por «sin reintentos (ADR-012): el fallo queda en `FAILED`».

## 2. Estrategia de pruebas (TDD)

**Antes de la fase roja:** crear `notification.repo.ts` con la interface y el stub, pasar `InMemoryNotificationRepo` en el helper de `post-visit.test.ts` y añadir `notificationRepo` a las options → `pnpm test` en verde (CA-10).

**Fase roja:** `notification.repo.test.ts` (CA-9) y casos nuevos en `post-visit.test.ts` (CA-1 a CA-8) → fallan porque el notifier aún no guarda ni comprueba nada.

**Fase verde:** implementar en `MessagingPostVisitNotifier` el orden de la spec §4:
1. `incidentRepo.findById` (sin cambios).
2. `notificationRepo.existsForIncident(incidentId, POST_VISIT_TEMPLATE_ID)` → si `true`, `skipped` con `ALREADY_SENT` por cada destinataria (gestora si existe + inquilina), log `info`, `return`.
3. Plantilla y bucle de envío (sin cambios).
4. Tras cada `sendSms`: `create` con `QUEUED` + `providerMessageId` + `sentAt = new Date()`; en el `catch`: `create` con `FAILED` + `error = error.name` + `sentAt = null`.

**Dobles de prueba:**

- `MessagingService` falso con `vi.fn()` (igual que la B2): `mockResolvedValueOnce` / `mockRejectedValueOnce(Object.assign(new Error('x'), { name: 'VonageNetworkError' }))`.
- `InMemoryNotificationRepo` vacío o con una `Notification` previa (`QUEUED` para CA-2, `FAILED` para CA-5). Para CA-9, una con otro `template` y otra con otro `incidentId`.
- `InMemoryIncidentRepo` con las incidencias de prueba de la B2 (con y sin gestora). Teléfonos del seed, nunca reales.
- Logger mockeado (`vi.mock('../lib/logger.js')`) para CA-8: ni teléfonos ni texto del SMS en logs ni en `Notification.error`.
- `sentAt`: comprobar que es `Date` en `QUEUED` y `null` en `FAILED` (sin fake timers).
- `PrismaNotificationRepo` sin test unitario (necesita Postgres; queda para B5/integración).

## 3. Orden de ejecución

1. ✅ Requisitos y spec (Q1–Q6 cerradas el 21/11).
2. ✅ `main` (con la B2) mergeado en la rama (23/11).
3. Aprobar este plan.
4. Publicar en el #14 el alcance y las decisiones Q1–Q6 (o enlazar la nota del #10).
5. Repo + stub + ajuste del helper → `pnpm test` en verde.
6. Fase roja → fase verde.
7. `PrismaNotificationRepo` + `pnpm check` + `pnpm test`.
8. `04-validation.md` y PR con `Closes #14`, avisando de que `MessagingPostVisitNotifier` pide `notificationRepo` (lo usará la A4).

## 4. Riesgos y mitigaciones

| Riesgo | Mitigación |
| ------ | ---------- |
| La A4 (#10) construye el notifier sin `notificationRepo` | Avisar en el PR y en el #10; el tipo obliga a pasarlo y TypeScript lo marca |
| Dos `session.end` simultáneos envían dos veces | Riesgo aceptado (Q6); anotar como pendiente post-MVP (restricción única) |
| SMS enviado pero falla el `create` | Riesgo aceptado (spec §7); el error se propaga a la A4 |
| El equipo prefiere `FAILED` reenviable o reintentos | Las decisiones están aisladas en el paso 2 del notifier; cambiar la regla es pequeño |
| Mariellys no ha respondido en #10/#14 | No bloquea: se sigue el ADR-012 y `docs/TASKS.md` §11 |

## 5. Pendiente

- Aprobación de este plan (Carolina).
- Publicar Q1–Q6 en el #14.
- Respuesta del equipo (no bloquea).

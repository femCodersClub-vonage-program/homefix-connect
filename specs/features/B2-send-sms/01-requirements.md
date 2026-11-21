# B2 · Aviso post-visita por SMS (`sendPostVisit`) — Requisitos

> Issue: #13 · Rama: `feat/B2-send-sms` · Depende de: B1 (#12, PR #43), X1 (`IncidentRepo`, `MessagingService`)

## 1. Requisitos clasificados

### Explícitos (issue #13, `docs/`)

| ID   | Requisito | Fuente |
| ---- | --------- | ------ |
| E-01 | `sendPostVisit(incidentId, technicianName)` en `src/services/messaging.service.ts` | Issue #13 |
| E-02 | Plantilla: `Visita realizada para la incidencia «{titulo}» por {tecnica}. Cuando el informe esté listo te notificaremos.` | Issue #13 |
| E-03 | Destinatarias: la gestora (`Incident.manager`) y la inquilina (`Incident.tenant`), con su `User.phone` | Issue #13 |
| E-04 | Los teléfonos salen **solo** de `User.phone` (no de `.env`) | Issue #13 (decisión a confirmar) |
| E-05 | Cada SMS se envía con `MessagingService.sendSms(phone, body)` (cliente de B1) | Issue #13 · B1 |
| E-06 | Test unitario con stubs de B1 (`MessagingService`) y de `IncidentRepo` | Issue #13 |
| E-07 | La A4 (#10) llama a `sendPostVisit` al recibir `session.end` | Issue #10 (dependencia hard de A4 sobre B2) |

### Derivados

| ID   | Requisito | Justificación |
| ---- | --------- | ------------- |
| D-01 | `IncidentRepo.findById` devuelve también `tenant` y `manager` | Hoy solo incluye `technician` y `visit.videoSession`: sin esto no hay teléfonos |
| D-02 | Si la incidencia no tiene gestora (`managerId` es opcional), se envía solo a la inquilina y se deja un log `warn` | `schema.prisma`: `managerId String?` · decisión 3 del #13 |
| D-03 | Si la incidencia no existe → error claro, sin enviar nada | Principio de errores claros (AGENTS.md §5.1) |
| D-04 | `sendPostVisit` devuelve, por cada SMS enviado, la destinataria y su `providerMessageId` | La B3 lo necesita para crear las `Notification` |
| D-05 | Los logs no llevan el texto del SMS ni el teléfono completo | `backend/AGENTS.md` §7 · mismo criterio que B1 |
| D-06 | El service no importa `express` ni sabe de HTTP; se testea sin Postgres | `backend/AGENTS.md` §3 y §8 |

## 2. Hallazgos al revisar el repo (20/11)

- **Solape B2/B3:** el #13 pide `sendPostVisit` + 2 `Notification` + idempotencia, pero `docs/TASKS.md` pone `sendPostVisit` + `Notification` en la B3 y la A4 espera `sendPostVisit` de la B2. Decisión publicada en el #13 (ver §4).
- **`IncidentWithRelations`** (X1) no incluye `tenant` ni `manager`. Ampliarlo obliga a actualizar el `include` de `PrismaIncidentRepo` y los fixtures de `stubs.test.ts` y `video-tokens.test.ts` (tests de otras tareas: solo añadir campos).
- **`MessagingService`** (X1) solo tiene `sendSms`, y `VonageMessagesClient` (B1) la implementa. Si se añade `sendPostVisit` a esa misma interface, el cliente de B1 tendría que implementarlo, y no le toca (es solo el cliente de Vonage). Ver Q1.
- No hay repo de `Notification` (ni interface ni stub): queda para la B3.
- Seed: inquilina `+34600000001`, técnica `+34600000002`, gestora `+34600000003`.
- Se puede programar y testear con `InMemoryMessagingService` e `InMemoryIncidentRepo` (X1), sin esperar al merge del #43.

## 3. Desconocidos (preguntas)

| #  | Pregunta | Opciones | Recomendación |
| -- | -------- | -------- | ------------- |
| Q1 | ¿Dónde vive `sendPostVisit`? | A) Añadirlo a la interface `MessagingService` (B1 tendría que implementarlo) · B) Interface nueva `PostVisitNotifier` en `messaging.service.ts`, con una clase que recibe `MessagingService` + `IncidentRepo` | **B**: el cliente de B1 sigue siendo solo «enviar un SMS» y la A4 depende de la interface nueva |
| Q2 | ¿`technicianName` como parámetro o sacado de la incidencia? | A) Parámetro, como dice el issue · B) Se saca de `incident.technician.name` | **A** (lo fija el issue y la A4 lo tiene a mano); si llega vacío, se usa `incident.technician?.name` |
| Q3 | ¿Qué devuelve `sendPostVisit`? | A) `void` · B) `{ sent: [{ recipientId, providerMessageId }], skipped: [...] }` | **B**: la B3 lo necesita para las `Notification` |
| Q4 | Si falla un SMS (p. ej. el de la gestora), ¿se sigue con el otro? | A) Se para y lanza el error · B) Se envía el otro igual y se informa del fallo | **B**: que una no se quede sin aviso por la otra; el error se devuelve en el resultado (la B3 decidirá reintentos) |
| Q5 | Orden de envío | Gestora primero, luego inquilina (como el issue) · o al revés | Gestora → inquilina (orden del issue) |
| Q6 | ¿Valida que la incidencia esté en `VIDEO_COMPLETED`? | A) Sí · B) No: eso lo controla la A4 | **B**: la A4 ya hace el cambio de estado y la idempotencia |

## 4. Decisiones de Clarificación Acordadas

Publicadas en el #13 (20/11, 23:36), sin respuesta aún:

| # | Decisión |
| - | -------- |
| Alcance | B2 = `sendPostVisit` (plantilla + 2 SMS con `sendSms`). B3 = guardar las 2 `Notification` (`QUEUED` + `providerMessageId`) e idempotencia |
| Teléfonos | Ampliar `IncidentRepo.findById` con `tenant` y `manager` (cambio aditivo) |
| Sin gestora | Solo a la inquilina + log `warn`, sin error |

Q1–Q6: ⏳ pendientes.

## 5. Fuera de alcance

- Crear/guardar `Notification`, idempotencia y reintentos (B3).
- Conectar `sendPostVisit` al webhook `session.end` (A4).
- Webhook `message.status` (B4, post-MVP).
- Contract tests (B5).

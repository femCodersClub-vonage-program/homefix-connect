# B3 · Registros `Notification` + idempotencia del aviso post-visita — Validación

> Spec: [`02-specification.md`](./02-specification.md) · Plan: [`03-plan.md`](./03-plan.md) · Issue: #14

## Resultado de los tests

Rama `feat/B3-notifications` (desde `main` `5ba2414`, con la B2 #44), 23/11, en local (Windows, PowerShell):

```text
$ pnpm check
$ pnpm lint && pnpm typecheck
$ eslint .
backend typecheck$ tsc --noEmit -p tsconfig.json  → Done
frontend typecheck$ tsc --noEmit -p tsconfig.json → Done

$ pnpm test   (backend)
Test Files  10 passed (10) · Tests  111 passed (111)
(9 nuevos de la B3 en post-visit.test.ts + 2 en notification.repo.test.ts)
```

## Criterios de aceptación

| Criterio | Test | Resultado |
|---|---|---|
| CA-1 · Registro correcto: 2 `Notification` `QUEUED` con `template`, `recipientId`, `providerMessageId` y `sentAt` | `post-visit.test.ts` (1 test) | ✅ |
| CA-2 · Ya enviado: no llama a `sendSms`, no crea nada, `ALREADY_SENT` por destinataria (con y sin gestora) | `post-visit.test.ts` (2 tests) | ✅ |
| CA-3 · Dos llamadas seguidas: 2 SMS en total y 2 `Notification` | `post-visit.test.ts` (1 test) | ✅ |
| CA-4 · Falla el SMS de la gestora: `FAILED` + nombre del error + `sentAt = null`; inquilina `QUEUED` | `post-visit.test.ts` (1 test) | ✅ |
| CA-5 · `FAILED` previo: no reenvía (`ALREADY_SENT`) | `post-visit.test.ts` (1 test) | ✅ |
| CA-6 · Sin gestora: solo la `Notification` de la inquilina y `NO_MANAGER` | `post-visit.test.ts` (1 test) | ✅ |
| CA-7 · Incidencia inexistente: lanza, no envía ni crea nada | `post-visit.test.ts` (1 test) | ✅ |
| CA-8 · Ni logs ni `Notification.error` llevan teléfonos ni el texto del SMS (aunque el error de Vonage los traiga en el mensaje) | `post-visit.test.ts` (1 test) | ✅ |
| CA-9 · `existsForIncident` solo con mismo `incidentId` y `template`; `create` rellena `id`, `channel`, fechas y `null` | `notification.repo.test.ts` (2 tests) | ✅ |
| CA-10 · Los tests de la B2 siguen en verde; `pnpm check` y `pnpm test` pasan | Suite completa | ✅ |
| `PrismaNotificationRepo` contra Postgres | — | ⏳ Sin test unitario (necesita BD): B5 / integración |

## Proceso TDD

1. `docs(B3): add requirements and clarification decisions` (`7833ae7`) y `docs(B3): add specification` (`2c798db`). Decisiones Q1–Q6 cerradas el 21/11.
2. 23/11: tras mergear el #44 (B2), `git merge origin/main` (`902e7f0`). Conflictos en `messaging.service.ts` y `B2-send-sms/04-validation.md` resueltos con la versión de `main` (la rama partía de una B2 anterior). Verificado: rama = `main` + specs de la B3.
3. `docs(B3): add implementation plan` (`cc7c36f`).
4. `NotificationRepo` + `InMemoryNotificationRepo` + `PrismaNotificationRepo`; `notificationRepo` en las options del notifier (sin usarlo) y helper de `post-visit.test.ts` con el repo en memoria.
5. Fase roja: 9 tests nuevos de la B3 → **8 en rojo** (CA-7 ya pasaba con el código de la B2); 103 en verde.
6. Fase verde: comprobación `ALREADY_SENT` y `create` `QUEUED`/`FAILED` en `sendPostVisit` → **111/111**; `pnpm check` OK.

## Hallazgos durante la implementación

- El `create` va **fuera** del `try/catch` del envío: si falla la BD, el error se propaga (spec §6) y no se confunde con un SMS fallido.
- `Notification.error` guarda solo `error.name` (p. ej. `VonageNetworkError`), nunca `error.message`, que podría llevar teléfono o texto.
- El comentario de la B2 «los reintentos son de la B3» se ha cambiado: no hay reintentos (ADR-012).

## Pendientes

- Publicar Q1–Q6 en el #14.
- A4 (#10): construir `MessagingPostVisitNotifier` con `PrismaNotificationRepo` y llamarlo desde `session.end`.
- Restricción única contra dos `session.end` simultáneos (Q6, post-MVP).
- `SUBMITTED` / `DELIVERED` vía webhook `message.status` (B4, post-MVP).

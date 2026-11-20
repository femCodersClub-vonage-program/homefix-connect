# B2 · Aviso post-visita por SMS (`sendPostVisit`) — Validación

> Spec: [`02-specification.md`](./02-specification.md) · Plan: [`03-plan.md`](./03-plan.md) · Issue: #13

## Resultado de los tests

Rama `feat/B2-send-sms` (desde `main` `5f72025`, con C3 #42; sin la B1 #43), 20/11, en local (Windows, PowerShell):

```text
$ pnpm check
$ pnpm lint && pnpm typecheck
$ eslint .
frontend typecheck$ tsc --noEmit -p tsconfig.json → Done
backend typecheck$ tsc --noEmit -p tsconfig.json  → Done

$ pnpm test
backend:  Test Files  7 passed (7) · Tests  73 passed (73)
          (de ellos, 9 en src/__tests__/post-visit.test.ts)
frontend: Test Files  5 passed (5) · Tests  36 passed (36)
```

## Criterios de aceptación

| Criterio | Test (`post-visit.test.ts`) | Resultado |
|---|---|---|
| CA-1 · Envía 2 SMS (gestora → inquilina) con su `phone` y la plantilla; `sent` trae los 2 `providerMessageId` | 1 test | ✅ |
| CA-2 · El texto sigue exactamente la plantilla post-visita | `buildPostVisitBody` (1 test) | ✅ |
| CA-3 · Sin gestora: solo a la inquilina, gestora en `skipped`, log `warn` | 1 test | ✅ |
| CA-4 · Si falla un SMS se envía el otro; si fallan los dos no lanza (`failed` con el nombre del error) | 2 tests | ✅ |
| CA-5 · Incidencia inexistente: lanza error y no envía nada | 1 test | ✅ |
| CA-6 · `technicianName` vacío → nombre de la técnica de la incidencia; sin técnica → error sin enviar | 2 tests | ✅ |
| CA-7 · Los logs no llevan el texto del SMS, el título ni teléfonos | 1 test | ✅ |
| CA-8 · `findById` trae `tenant` y `manager`; los tests de X1 (`stubs.test.ts`) y A3 (`video-tokens.test.ts`) siguen en verde | Suite completa | ✅ |
| CA-9 · `pnpm check` y `pnpm test` en verde | Ver arriba | ✅ |
| Prueba con SMS real | — | ⏳ Fuera de la B2: se conecta en A4/B3 con el cliente de la B1 (#43) y falta número para `VONAGE_MESSAGES_FROM` |

## Proceso TDD

1. `docs(B2): add requirements and specification` (`fe92f91`) y `docs(B2): add implementation plan` (`9730537`). Decisiones de alcance y Q1–Q6 en el #13.
2. Ampliar `IncidentWithRelations` (X1) con `tenant` y `manager`, el `include` de `PrismaIncidentRepo` y los fixtures de `stubs.test.ts` y `video-tokens.test.ts` → 64/64 en verde (sin cambios de comportamiento).
3. Fase roja: `post-visit.test.ts` → 9 tests en rojo (`MessagingPostVisitNotifier is not a constructor`, `buildPostVisitBody is not a function`).
4. Fase verde: plantilla, tipos, `PostVisitNotifier` y `MessagingPostVisitNotifier` en `messaging.service.ts` → 9/9 y 73/73.
5. Pasos 2–4 subidos en un único commit: `feat(messaging): add sendPostVisit (B2)` (`6ad8a10`).

## Hallazgos durante la implementación

- `IncidentRepo.findById` (X1) no traía a la inquilina ni a la gestora; ampliarlo es aditivo pero obliga a completar los fixtures de tests de otras tareas.
- La B2 solo depende de la interface `MessagingService` (X1), así que no necesita la B1 en `main` para programarse ni testearse.
- El texto del SMS post-visita con el título del seed ocupa unos 130 caracteres (cabe en un SMS).

## Pendientes

- Cuando se mergee el #43 (B1): `git merge main` en esta rama. Conflicto previsto en `messaging.service.ts` (las dos tareas añaden al final y las dos importan `logger`): dejar ambas partes y un solo import.
- Guardar las `Notification`, idempotencia y reintentos: B3 (#14).
- Llamar a `sendPostVisit` desde `session.end` y crear el notifier real con `createVonageMessagesClient`: A4 (#10).

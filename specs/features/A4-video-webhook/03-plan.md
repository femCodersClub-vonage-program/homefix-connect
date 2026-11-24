# A4 · Webhook de fin de videollamada — Plan de implementación

> Spec: [`02-specification.md`](./02-specification.md) · Issue: #10 · Rama: `feat/A4-video-webhook` (sale de `feat/B3-notifications`, PR #47) · Estado: borrador, pendiente de aprobación

## 1. Ficheros afectados

| Etiqueta   | Fichero | Qué y por qué |
| ---------- | ------- | ------------- |
| `[NEW]`    | `backend/src/routes/video-events.ts` | `VideoEventsDeps` y `createVideoEventsRouter`: `verifyVonageSignature(getSignatureSecret)` + validación `zod` + cierre + `sendPostVisit` |
| `[MODIFY]` | `backend/src/app.ts` | `AppDeps` con `postVisitNotifier` y `getSignatureSecret`; notifier por defecto (`createVonageMessagesClient` + `PrismaNotificationRepo`) y montar el router bajo `/api` |
| `[NEW]`    | `backend/src/__tests__/video-events.test.ts` | CA-1 a CA-9 con Supertest, repos en memoria, notifier falso y firma con `signVonageJwt` |

Sin cambios en `schema.prisma`, `openapi.yaml`, repos ni servicios.

> El notifier por defecto usa `env.VONAGE_APPLICATION_ID`, `env.VONAGE_PRIVATE_KEY_PATH` y `env.VONAGE_MESSAGES_FROM`. Sin ellos la app arranca igual (B1 Q5): solo fallarían los SMS (`FAILED`).

## 2. Estrategia de pruebas (TDD)

**Fase roja:** `video-events.test.ts` con CA-1 a CA-9 → fallan con 404 porque la ruta no existe.

**Fase verde:** router + cambios en `app.ts` hasta que pasen.

**Dobles de prueba:**

- `createApp({ incidentRepo, videoSessionRepo, postVisitNotifier, getSignatureSecret: () => TEST_SECRET, videoService, applicationId })` (igual que `video-tokens.test.ts`, sin Postgres ni red).
- `InMemoryVideoSessionRepo` con una sesión `ACTIVE` (`vonageSessionId = 'vonage-session-demo'`) y su `visit`; `InMemoryIncidentRepo` con la incidencia `VISIT_ASSIGNED`.
- `postVisitNotifier = { sendPostVisit: vi.fn().mockResolvedValue({ sent: [...], failed: [], skipped: [] }) }`; para CA-8, `mockRejectedValue(new Error('db down'))`.
- Cuerpo enviado como texto con `.set('Content-Type', 'application/json').send(body)` y `Authorization: Bearer ${signVonageJwt(body)}`, para que `payload_hash` coincida con lo que firma la X3.
- Logger mockeado (`vi.mock('../lib/logger.js')`) para CA-8 y CA-9.

## 3. Orden de ejecución

1. ✅ Requisitos y spec (Q1–Q9 acordadas el 23/11, `efa6464`).
2. Aprobar este plan.
3. Publicar Q1–Q9 en el #10.
4. Fase roja: `video-events.test.ts`.
5. Fase verde: `video-events.ts` + `app.ts`.
6. `pnpm check` + `pnpm test`.
7. Cuando se mergee el #47 (B3): `git merge origin/main` en esta rama.
8. `04-validation.md` y PR con `Closes #10`.
9. Prueba real (ngrok + callback en el panel de Vonage) → I1; avisar en el PR.

## 4. Riesgos y mitigaciones

| Riesgo | Mitigación |
| ------ | ---------- |
| Vonage Video firma los callbacks de otra forma que la X3 | Comprobar con un callback real en la I1 / preguntar en la sesión con Vonage; el middleware está aislado y se cambia fácil |
| `sessionDestroyed` tarda ~1 min | Aceptado (Q9); avisar a Miranda (C5) en el sync |
| La rama sale de la B3 (#47) sin mergear | Si la review pide cambios en la B3, traerlos con `git merge feat/B3-notifications`; tras el merge, `git merge origin/main` |
| Falla `updateStatus` después de `ENDED` (incidencia sin `VIDEO_COMPLETED`) | Riesgo aceptado (spec §6); BD local en el MVP |
| Otra tarea abierta toca `app.ts` | Revisar PRs abiertos antes del PR (#45 es frontend) |

## 5. Pendiente

- Aprobación de este plan (Carolina).
- Publicar Q1–Q9 en el #10.
- Merge del #47 (no bloquea programar; sí el merge de este PR).

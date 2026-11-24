# A5 · Tests de vídeo (unit + integración) — Requisitos

> Issue: #11 · Rama: `test/A5-video` (sale de `feat/A4-video-webhook`, PR #48, con `test/B5-messaging`, PR #49, mergeada dentro) · Depende de: A3 (✅ en `main`), A4 (#48) y la infraestructura de integración de la B5 (#49)

## 1. Requisitos clasificados

### Explícitos (issue #11 + `docs/`)

| ID   | Requisito | Fuente |
| ---- | --------- | ------ |
| E-01 | Tests del carril de vídeo: unit + contract | `TASKS.md` §6 (A5) |
| E-02 | Bloqueada por A3 y A4 | `TASKS.md` §6 |
| E-03 | Integración en `backend/tests/integration/` (rutas + BD/webhooks, Supertest) | `AGENTS.md` §10 |
| E-04 | Los unitarios no tocan Postgres y viven en `src/**/*.test.ts` | `AGENTS.md` §10 |
| E-05 | Contract tests (Pact) los define el equipo, no la IA | `AGENTS.md` §10 y §12 |
| E-06 | Sin dependencias nuevas, sin cambios en `schema.prisma`/`openapi.yaml` | `AGENTS.md` §12 |
| E-07 | Los tests no dependen del orden ni de datos previos | `backend/AGENTS.md` §8 |
| E-08 | A5, B5 y C6 cierran sus carriles y desbloquean I1 | `TASKS.md` §10 |

### Derivados

| ID   | Requisito | Justificación |
| ---- | --------- | ------------- |
| D-01 | La parte **unit** ya está cubierta: `video-tokens.test.ts` (13, A3), `video-events.test.ts` (13, A4), `vonage-video.service.test.ts` (7, A2), `verifyVonageSignature`/`vonageSignature` (X3). La A5 no duplica: solo añade lo que falta | Revisión del repo (24/11) |
| D-02 | Nuevo: `PrismaVideoSessionRepo` contra Postgres real (`findByVisitId`, `findByVonageSessionId` con `visit`, `update`) | Nunca se ha probado con BD; A3 y A4 dependen de él |
| D-03 | Nuevo: `POST /api/video-tokens` con repos Prisma reales y Vonage Video falso (sala guardada en BD, `ACTIVE`, una sola sala con peticiones simultáneas, 409 con sesión `ENDED`) | Comprobar A3 con BD de verdad |
| D-04 | Nuevo: `POST /api/webhooks/video-events` con BD real, firma real (X3) y aviso post-visita real (B3) con SMS falsos | Comprobar A4 de punta a punta: cierre, idempotencia, fallo de SMS |
| D-05 | Nuevo: flujo completo del carril A (tokens → `sessionDestroyed` → 409 al volver a entrar) | Es lo más cercano a I1 sin Vonage real |
| D-06 | Reutilizar la infraestructura de la B5 (`vitest.integration.config.ts`, `global-setup`, `helpers/db.ts`) sin tocarla | Evitar duplicar y evitar conflictos con #49 |

## 2. Hallazgos al revisar el repo (24/11)

- Los 33 unitarios de vídeo cubren todos los CA de A2, A3 y A4 con repos en memoria. Lo que no se había probado es que **las mismas rutas funcionan con Prisma y Postgres**.
- `createApp()` ya acepta como dependencias `videoService`, `applicationId`, `postVisitNotifier` y `getSignatureSecret`, así que se puede montar la app real con lo externo sustituido sin tocar `src/`.
- El helper `src/__tests__/helpers/vonageJwt.ts` (X3) firma webhooks igual que Vonage; se reutiliza.
- **Contrato:** el MVP tiene dos endpoints de vídeo (`/video-tokens`, `/webhooks/video-events`). Pact sería una dependencia nueva y los contract tests los define el equipo (§12). La IA no los escribe.

## 3. Decisiones de clarificación (propuestas)

| #  | Pregunta | Propuesta |
| -- | -------- | --------- |
| Q1 | ¿Qué parte de «contract» entra? | **Supertest**, como dice el issue («Supertest vale; Pact si hay consumidor externo»). No hay consumidor externo → sin Pact. Los tests de ruta de A3/A4 pasan a `tests/contract/` |
| Q2 | ¿Dónde van los unitarios? | En `tests/unit/`, como pide el issue: se mueve `vonage-video.service.test.ts` (A2) |
| Q3 | ¿De dónde sale la rama? | De `feat/A4-video-webhook` con `test/B5-messaging` mergeada (necesita el código de la A4 y la infra de la B5) |
| Q4 | ¿Qué se sustituye? | Solo lo externo: Vonage Video (`VideoService` falso), Vonage Messages (`MessagingService` falso) y el secreto de firma (de test). Rutas, repos y `sendPostVisit` son los reales |
| Q5 | ¿Se toca la infra de la B5? | **No.** Helper nuevo `helpers/video.ts`; se reutilizan `IDS` y `resetDatabase` |
| Q6 | ¿CI? | No (igual que B5: no hay Postgres en CI) |

| Q7 | ¿Se mueven también los tests de otros carriles? | **No**: solo los de vídeo (alcance de la A5) |
| Q8 | «Todos pasan en `pnpm --filter backend test`» | `pnpm test` = unit + contract (sin Docker). La integración sigue en `test:integration` (B5): la CI ejecuta `pnpm test` sin Postgres. Añadir Postgres a la CI se propone como mejora aparte |
| Q9 | Fixtures de Vonage | `tests/fixtures/vonage-video/`: `sessionCreated`, `sessionDestroyed`, `connectionDestroyed`, `streamCreated` con la estructura de la doc oficial de Session Monitoring |

Q1–Q9 decididas por Carolina el 24/11 («hazlo como pidió Mariellys»), publicadas en el #11. Se aparta de `AGENTS.md` §10 (unitarios en `src/**`, contrato con Pact) porque manda el issue; avisado en el PR.

## 4. Fuera de alcance

- Pact (Q1).
- Mover los tests de mensajería, X3 o incidents (Q7).
- Vonage real (llamadas, SMS) y E2E con Playwright → I1.
- Postgres en CI.
- Cambios en `src/`.

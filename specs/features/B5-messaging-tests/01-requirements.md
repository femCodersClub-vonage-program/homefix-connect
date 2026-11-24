# B5 · Tests de messaging (unit + integración) — Requisitos

> Issue: #16 · Rama: `test/B5-messaging` (sale de `feat/B3-notifications`, PR #47) · Depende de: B3 (#47). La B4 ya no es dependencia (post-MVP)

## 1. Requisitos clasificados

### Explícitos (issue #16 + refinamiento + `docs/`)

| ID   | Requisito | Fuente |
| ---- | --------- | ------ |
| E-01 | Unit de `VonageMessagesClient.sendSms` (mock del SDK/HTTP) | Issue #16 |
| E-02 | Unit de `sendPostVisit` (stubs de B1 + repo) | Issue #16 |
| E-03 | Alcance reducido: unit + «contrato» de `sendPostVisit` y de la plantilla post-visita; **integración solo si la B3 toca BD** (la toca: `PrismaNotificationRepo`) | Refinamiento del #16 (PR #34) |
| E-04 | Sin webhook `message-status` (B4 post-MVP) | Refinamiento del #16 · `TASKS.md` §11 |
| E-05 | Integración en `backend/tests/integration/`, con BD levantada; la carpeta se crea con la B5 | `AGENTS.md` §10 · `backend/AGENTS.md` §8 |
| E-06 | Los unitarios no tocan Postgres | `AGENTS.md` §10 |
| E-07 | `pnpm test` = unit + contrato y debe pasar sin BD | `SDD_PLAN.md` §4 |
| E-08 | Los scripts de test nuevos se añaden con A5/B5/C6/I1 | `README.md` |
| E-09 | El test no depende del orden ni de datos previos | `backend/AGENTS.md` §8 |
| E-10 | Sin dependencias nuevas, sin cambios en `schema.prisma`/`openapi.yaml` | `AGENTS.md` §12 |

### Derivados

| ID   | Requisito | Justificación |
| ---- | --------- | ------------- |
| D-01 | E-01 y E-02 ya están cubiertos: `vonage-messages.client.test.ts` (25), `vonage-messages.factory.test.ts` (2), `post-visit.test.ts` (18, de ellos 9 de la B3), `notification.repo.test.ts` (2). La B5 los revisa y solo añade huecos | Revisión del repo (23/11) |
| D-02 | Nuevo: `PrismaNotificationRepo` contra Postgres real (`existsForIncident`, `create`) | E-03 · pendiente de la B3 (CA sin test) |
| D-03 | Nuevo: `sendPostVisit` de punta a punta con Prisma real (`PrismaIncidentRepo` + `PrismaNotificationRepo`) y `MessagingService` falso → 2 `Notification` en BD; segunda llamada → `ALREADY_SENT` | E-03 · idempotencia de la B3 con BD de verdad |
| D-04 | Script nuevo `test:integration` en `backend/package.json`; `pnpm test` excluye `tests/integration/` | E-07 · E-08 |
| D-05 | Cada test de integración limpia sus datos (o usa ids propios) | E-09 |

## 2. Hallazgos al revisar el repo (23/11)

- No hay `vitest.config` en `backend/`: Vitest usa la configuración por defecto, que **incluye** `tests/**/*.test.ts`. Si se crea `tests/integration/` sin más, `pnpm test` pasará a necesitar Postgres (rompe E-07).
- Docker solo levanta un Postgres (`homefix`, puerto 5432). No hay base de datos de test.
- `prisma db push` crea la base si no existe (Postgres), así que `homefix_test` se podría crear con el mismo contenedor sin herramientas nuevas.
- `db/client.ts` crea el `PrismaClient` con `DATABASE_URL`; para los tests de integración hay que apuntarlo a la BD de test **antes** de importarlo.
- «Contrato» en el refinamiento: sin la B4 la mensajería no expone ningún endpoint; el «contrato» de `sendPostVisit` y de la plantilla ya lo cubren los tests de tipos y `buildPostVisitBody` (B2). Pact no aplica y sería dependencia nueva. Los contract tests los define el equipo (`AGENTS.md` §10).

## 3. Decisiones de Clarificación Acordadas

| #  | Pregunta | Decisión |
| -- | -------- | --------- |
| Q1 | ¿Qué BD usan los tests de integración? | **`homefix_test`** en el mismo contenedor (`DATABASE_URL` de test), nunca la de desarrollo |
| Q2 | ¿Cómo se crea y se prepara el esquema? | `prisma db push` contra `homefix_test` antes de los tests (dentro del script `test:integration`) |
| Q3 | ¿Cómo se separa de `pnpm test`? | `vitest.config.ts` en `backend/` con `exclude: ['tests/integration/**', …]` + script `test:integration` con su propio include. ⚠️ Toca estructura/comandos (`AGENTS.md` §12): mencionarlo en el PR |
| Q4 | ¿Qué parte de «contrato» entra? | **Ninguna nueva**: se documenta que lo cubren los tests de la B2/B3; Pact queda fuera (sin endpoint de mensajería en el MVP) |
| Q5 | ¿Se mueven los unitarios existentes a `tests/unit/`? | **No**: `AGENTS.md` §10 dice que los unitarios viven en `src/**/*.test.ts` |
| Q6 | ¿Limpieza de datos? | `deleteMany` de las tablas tocadas en `beforeEach` (solo en `homefix_test`) + seed mínimo propio |
| Q7 | ¿Se ejecuta en CI? | No en esta tarea (no hay Postgres en CI); se documenta cómo lanzarlo en local |

Acordadas por Carolina el 23/11 (propuesta tal cual). Pendiente: publicarlas en el #16.

## 4. Fuera de alcance

- Webhook `message-status` y sus tests (B4, post-MVP).
- Pact / contract tests (los define el equipo; sin endpoint de mensajería).
- Tests de vídeo (A5) y E2E (I1).
- Postgres en CI.

# B5 · Tests de messaging (unit + integración) — Especificación

> Issue: #16 · Rama: `test/B5-messaging` · Requisitos: `01-requirements.md` · Estado: borrador (Q1–Q7 acordadas, 23/11)

## 1. Resumen y contexto

Los unitarios del carril B ya existen (B1, B2, B3). Falta comprobar que **la persistencia funciona con Postgres de verdad**: que `PrismaNotificationRepo` guarda y consulta bien y que `sendPostVisit` deja las `Notification` en la BD y no reenvía.

La B5 añade una capa de **tests de integración** separada de `pnpm test`, con su propia BD (`homefix_test`).

## 2. Alcance

**Entra:**

- `backend/vitest.config.ts`: config por defecto + excluir `tests/integration/**` de `pnpm test`.
- `backend/vitest.integration.config.ts`: solo `tests/integration/**/*.test.ts`, `DATABASE_URL` de test, ejecución en serie y `globalSetup`.
- `backend/tests/integration/global-setup.ts`: `prisma db push` contra `homefix_test`.
- `backend/tests/integration/helpers/db.ts`: guarda de seguridad (solo BD `_test`), limpieza y seed mínimo.
- `backend/tests/integration/notification.repo.int.test.ts` y `post-visit.int.test.ts`.
- Script `test:integration` en `backend/package.json`.
- Documentar en el PR (y en `04-validation.md`) cómo se lanza.

**No entra:** B4, Pact, A5, E2E, CI con Postgres (ver `01-requirements.md` §4). No se mueven los unitarios.

## 3. Requisitos funcionales

| ID    | Requisito | Fuente |
| ----- | --------- | ------ |
| RF-1  | `pnpm test` sigue sin necesitar Postgres y no ejecuta nada de `tests/integration/` | E-07 · Q3 |
| RF-2  | `pnpm --filter backend test:integration` prepara el esquema en `homefix_test` y ejecuta solo los tests de integración | Q1 · Q2 · D-04 |
| RF-3  | La URL de test sale de `TEST_DATABASE_URL` o, si no existe, `postgresql://homefix:homefix@localhost:5432/homefix_test?schema=public` | Q1 |
| RF-4  | Si la URL de la BD no termina en `_test` (nombre de la BD), los tests abortan antes de borrar nada | Q1 · seguridad |
| RF-5  | Antes de cada test se vacían `Notification`, `VideoSession`, `Visit`, `Incident` y `User` y se crea un seed mínimo (inquilina, técnica, gestora, incidencia) | Q6 · E-09 |
| RF-6  | Los tests de integración se ejecutan en serie (un solo hilo/fichero a la vez) | Comparten BD |
| RF-7  | Sin dependencias nuevas; sin cambios en `schema.prisma`, `openapi.yaml` ni código de `src/` | E-10 |

## 4. Casos de prueba de integración

**`notification.repo.int.test.ts`** (`PrismaNotificationRepo`):

- **INT-1 · create:** guarda una `Notification` `QUEUED` con `providerMessageId` y `sentAt`; al leerla de la BD, `channel = SMS`, `createdAt`/`updatedAt` rellenos.
- **INT-2 · create FAILED:** guarda `error` y `sentAt = null`.
- **INT-3 · existsForIncident:** `false` sin registros; `true` con uno `post_visit` de esa incidencia; `false` si el registro es de otra incidencia o de otra plantilla.

**`post-visit.int.test.ts`** (`MessagingPostVisitNotifier` + `PrismaIncidentRepo` + `PrismaNotificationRepo`, `MessagingService` falso):

- **INT-4 · envío completo:** 2 SMS → 2 filas `QUEUED` en `Notification` (gestora e inquilina) con su `providerMessageId`.
- **INT-5 · idempotencia:** segunda llamada → `ALREADY_SENT`, `sendSms` no se vuelve a llamar y sigue habiendo 2 filas.
- **INT-6 · un SMS falla:** fila `FAILED` (gestora, `error = 'VonageNetworkError'`) + fila `QUEUED` (inquilina).
- **INT-7 · sin gestora:** 1 sola fila (inquilina).

## 5. Contrato (comandos y configuración)

```jsonc
// backend/package.json → scripts
"test": "vitest run",                                            // sin cambios (ahora con vitest.config.ts)
"test:integration": "vitest run --config vitest.integration.config.ts"
```

```ts
// backend/vitest.config.ts
import { configDefaults, defineConfig } from 'vitest/config';
export default defineConfig({
  test: { exclude: [...configDefaults.exclude, 'tests/integration/**'] },
});

// backend/vitest.integration.config.ts
export default defineConfig({
  test: {
    include: ['tests/integration/**/*.test.ts'],
    env: { DATABASE_URL: TEST_URL, NODE_ENV: 'test' },
    globalSetup: ['tests/integration/global-setup.ts'],
    fileParallelism: false,
  },
});
```

**Requisito previo:** `docker compose up -d` (Postgres en marcha).

## 6. Manejo de errores

| Caso | Qué pasa |
| ---- | -------- |
| Postgres apagado | Falla el `globalSetup` (`prisma db push`) con el error de conexión; no se ejecuta ningún test |
| URL sin `_test` | `global-setup` y el helper lanzan error antes de tocar datos (RF-4) |
| `homefix_test` no existe | `prisma db push` la crea (comprobar en la primera ejecución) |

## 7. Riesgos

| Riesgo | Mitigación |
| ------ | ---------- |
| Borrar datos de la BD de desarrollo por error | RF-4 (guarda `_test`) + URL de test por defecto distinta |
| `env.ts` carga `../.env` y pisa `DATABASE_URL` | No: carga con `override: false`; `test.env` de Vitest se aplica antes. Se comprueba en INT-1 (la fila aparece en `homefix_test`) |
| Añadir `vitest.config.ts` cambia qué ejecuta `pnpm test` | Se usa `configDefaults.exclude` + solo se añade `tests/integration/**`; CA-1 compara el nº de tests (124 en la A4 / 111 en esta rama) |
| Toca estructura/comandos (`AGENTS.md` §12) | Lo prevé el README (scripts de test con B5); se avisa en el PR |

## 8. Criterios de aceptación

- [ ] **CA-1 · `pnpm test` intacto:** mismo número de tests que antes (111 en esta rama) y sin necesitar Docker.
- [ ] **CA-2 · `test:integration`:** con Docker en marcha, prepara `homefix_test` y pasan INT-1 a INT-7.
- [ ] **CA-3 · Seguridad:** con una URL que no acaba en `_test`, falla antes de borrar nada.
- [ ] **CA-4 · Aislamiento:** los tests pasan en cualquier orden y repetidos (limpieza en `beforeEach`).
- [ ] **CA-5 · Sin regresiones:** `pnpm check` en verde.

## 9. Diseño técnico

Ver §2. El seed mínimo reutiliza los ids del seed real (`usr_tenant_demo`, `inc_demo`…) y teléfonos falsos (`+3460000000x`).

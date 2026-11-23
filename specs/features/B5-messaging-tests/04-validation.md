# B5 · Tests de messaging (unit + integración) — Validación

> Spec: [`02-specification.md`](./02-specification.md) · Plan: [`03-plan.md`](./03-plan.md) · Issue: #16

## Resultado de los tests

Rama `test/B5-messaging` (sobre `feat/B3-notifications` `5deba30`, PR #47 sin mergear), 23/11, en local (Windows, PowerShell, Docker Desktop con `homefix-db`):

```text
$ pnpm check
$ pnpm lint && pnpm typecheck
$ eslint .
frontend typecheck$ tsc --noEmit -p tsconfig.json → Done
backend typecheck$ tsc --noEmit -p tsconfig.json  → Done

$ pnpm test   (backend, sin Docker)
Test Files  10 passed (10) · Tests  111 passed (111)      ← igual que antes de la B5

$ docker compose up -d
$ pnpm --filter backend test:integration
(prisma db push contra homefix_test)
✓ tests/integration/notification.repo.int.test.ts (4 tests)
✓ tests/integration/post-visit.int.test.ts (4 tests)
Test Files  2 passed (2) · Tests  8 passed (8)
```

## Criterios de aceptación

| Criterio | Evidencia | Resultado |
|---|---|---|
| CA-1 · `pnpm test` intacto (111) y sin Docker | `pnpm test` tras añadir `vitest.config.ts`: 111/111 | ✅ |
| CA-2 · `test:integration` prepara `homefix_test` y pasan INT-1 a INT-7 | 8/8 (INT-1 en 2 tests); INT-1 comprueba `current_database()` = `*_test` | ✅ |
| CA-3 · Con una URL sin `_test` falla antes de borrar nada | `TEST_DATABASE_URL=…/homefix` → `Error: Los tests de integración solo se ejecutan contra una BD *_test (recibido: "homefix")` en `global-setup`, sin `db push` ni tests | ✅ |
| CA-4 · Repetible y sin depender del orden | Dos ejecuciones seguidas (19:31 y 19:38) en verde; la segunda partía de los datos de la primera | ✅ |
| CA-5 · `pnpm check` en verde | Ver arriba | ✅ |

## Proceso

1. `docs(B5): add requirements, specification and plan` (`b5e4a4f`). Q1–Q7 acordadas y publicadas en el #16 (23/11).
2. `vitest.config.ts` (excluye `tests/integration/**`) → `pnpm test` 111/111.
3. Infraestructura (`vitest.integration.config.ts`, `global-setup.ts`, helpers) + INT-1 a INT-7 + script `test:integration` → 8/8 a la primera con Docker en marcha.
4. CA-3 (guarda `_test`) y CA-4 (repetición) comprobados a mano.

## Hallazgos

- `prisma db push` creó `homefix_test` sin pasos manuales.
- Los tests de integración no encontraron fallos en la B3: el comportamiento con Postgres real coincide con los unitarios (QUEUED/FAILED, `ALREADY_SENT`, sin gestora).
- `tsconfig.json` del backend solo incluye `src/`: `pnpm typecheck` no comprueba `tests/integration/` (Vitest sí los transpila). Se deja así para no cambiar la estructura del scaffold.
- Prisma muestra un aviso de versión nueva al hacer `db push`: se ignora (sin dependencias nuevas, `AGENTS.md` §12).
- Con Docker Desktop cerrado, `docker compose up -d` falla con `dockerDesktopLinuxEngine` no encontrado: hay que abrir Docker Desktop antes.

## Cómo lanzarlo

```powershell
# 1. Docker Desktop abierto
docker compose up -d
# 2. Desde la raíz o desde backend/
pnpm --filter backend test:integration
```

`TEST_DATABASE_URL` es opcional (por defecto `…/homefix_test`); debe terminar en `_test`.

## Pendientes

- Merge del #47 → `git merge origin/main` y cambiar la base del PR a `main`.
- Postgres en CI (Q7, fuera de esta tarea).
- A5 puede reutilizar esta infraestructura para sus tests de integración de vídeo.

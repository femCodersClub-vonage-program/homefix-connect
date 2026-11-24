# B5 · Tests de messaging — Plan de implementación

> Spec: [`02-specification.md`](./02-specification.md) · Issue: #16 · Rama: `test/B5-messaging` (sale de `feat/B3-notifications`) · Estado: borrador, pendiente de aprobación

## 1. Ficheros afectados

| Etiqueta   | Fichero | Qué y por qué |
| ---------- | ------- | ------------- |
| `[NEW]`    | `backend/vitest.config.ts` | Defaults + excluir `tests/integration/**` (RF-1) |
| `[NEW]`    | `backend/vitest.integration.config.ts` | Include, `DATABASE_URL` de test, `globalSetup`, en serie (RF-2, RF-3, RF-6) |
| `[NEW]`    | `backend/tests/integration/global-setup.ts` | Guarda `_test` + `prisma db push --skip-generate` (RF-2, RF-4) |
| `[NEW]`    | `backend/tests/integration/helpers/db.ts` | `assertTestDatabase`, `resetDatabase`, `seedPostVisitData` (RF-4, RF-5) |
| `[NEW]`    | `backend/tests/integration/notification.repo.int.test.ts` | INT-1 a INT-3 |
| `[NEW]`    | `backend/tests/integration/post-visit.int.test.ts` | INT-4 a INT-7 |
| `[MODIFY]` | `backend/package.json` | Script `test:integration` |

Sin cambios en `src/`, `schema.prisma`, `openapi.yaml` ni dependencias.

## 2. Estrategia de pruebas

Aquí el «código» son los propios tests y la configuración, así que el orden es:

1. **`vitest.config.ts` primero** → `pnpm test` debe dar **111/111** igual que antes (CA-1).
2. **Infraestructura de integración** (config, `global-setup`, helper) + un test mínimo (INT-1) → `pnpm --filter backend test:integration` con Docker encendido: verde y la fila visible en `homefix_test` (comprueba que no se usa la BD de desarrollo).
3. **Resto de casos** (INT-2 a INT-7). Si alguno sale en rojo por un fallo real del código de la B3, se arregla en la B3 (#47), no aquí.
4. **CA-3:** lanzar con `TEST_DATABASE_URL` apuntando a `homefix` (sin `_test`) → debe abortar sin borrar nada.
5. **CA-4:** ejecutar `test:integration` dos veces seguidas.

## 3. Orden de ejecución

1. ✅ Requisitos (Q1–Q7 acordadas el 23/11) y spec.
2. Aprobar este plan.
3. Publicar Q1–Q7 en el #16.
4. Pasos 1–5 de §2.
5. `pnpm check`.
6. `04-validation.md` y PR con `Closes #16` (base `feat/B3-notifications` hasta que se mergee el #47), avisando del `vitest.config.ts` y del script nuevo.

## 4. Riesgos y mitigaciones

| Riesgo | Mitigación |
| ------ | ---------- |
| `prisma db push` no crea `homefix_test` | Crear la BD a mano una vez: `docker exec homefix-db createdb -U homefix homefix_test` |
| En Windows, `prisma` no se encuentra desde `execSync` | Usar `pnpm exec prisma db push` con `cwd` = `backend/` |
| `env.ts` carga `../.env` y usa la BD de desarrollo | `test.env` + `override: false`; la guarda `_test` lo detectaría |
| Cambiar la config de Vitest afecta a otros tests | Comparar el nº de tests antes/después (111) |

## 5. Pendiente

- Aprobación de este plan.
- Publicar Q1–Q7 en el #16.
- Merge del #47 (no bloquea programar).

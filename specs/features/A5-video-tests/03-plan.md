# A5 · Tests de vídeo — Plan de implementación

> Spec: [`02-specification.md`](./02-specification.md) · Issue: #11 · Rama: `test/A5-video`

## 1. Ficheros afectados

| Etiqueta | Fichero | Qué y por qué |
| -------- | ------- | ------------- |
| `[NEW]` | `backend/tests/integration/helpers/video.ts` | Seed de vídeo, dobles de Vonage y `createVideoTestApp()` |
| `[NEW]` | `backend/tests/integration/video-session.repo.int.test.ts` | INT-V1 a INT-V4 |
| `[NEW]` | `backend/tests/integration/video-tokens.int.test.ts` | INT-V5 a INT-V8 |
| `[NEW]` | `backend/tests/integration/video-events.int.test.ts` | INT-V9 a INT-V13 |

Sin cambios en `src/`, en la infraestructura de la B5, en `schema.prisma`, en `openapi.yaml` ni en dependencias.

## 2. Estrategia de pruebas

1. Repo primero (INT-V1 a V4): si falla, el problema está en Prisma y no en las rutas.
2. `/video-tokens` (INT-V5 a V8).
3. Webhook y flujo completo (INT-V9 a V13).
4. CA-3: dos ejecuciones seguidas.
5. CA-4: quitar a mano la comprobación de idempotencia de `video-events.ts` → INT-V10 debe fallar → deshacer.
6. Si un test sale en rojo por un fallo real de A3 o A4, se arregla en su PR (#48), no aquí.

## 3. Orden

1. Requisitos y spec (Q1–Q6 propuestas).
2. Tests (este plan).
3. `pnpm check` + `pnpm test` + `test:integration` en local con Docker.
4. `04-validation.md`, comentario en el #11 y PR en borrador con `Closes #11`.

## 4. Riesgos

| Riesgo | Mitigación |
| ------ | ---------- |
| Rama apilada sobre dos PR (#48 y #49) | PR en borrador; cuando se mergeen #47, #48 y #49: `git merge origin/main` y cambiar la base a `main` |
| Q1 (contrato) sin decidir | Se lleva al sync; si el equipo quiere Pact, va en otra tarea |
| Los imports del helper X3 (`src/__tests__/helpers`) desde `tests/` | Solo es un helper de test; evita duplicar la firma |

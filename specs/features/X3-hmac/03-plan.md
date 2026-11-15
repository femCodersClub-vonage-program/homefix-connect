# X3 · Plan técnico

> Spec: [`02-specification.md`](./02-specification.md) · Issue [#6](https://github.com/femCodersClub-vonage-program/homefix-connect/issues/6)

Aprobado por quien toma la tarea antes de empezar a codear.

| Paso | Archivo | Acción |
|---|---|---|
| 1 | Issue #6 | Comentario con las decisiones de especificación (cabecera real, un secreto, 401) |
| 2 | `backend/src/__tests__/helpers/vonageJwt.ts` | Helper de test que firma JWT HS256 falsos |
| 3 | `backend/src/__tests__/vonageSignature.test.ts` | Tests de la función pura (rojo) |
| 4 | `backend/src/__tests__/verifyVonageSignature.test.ts` | Tests del middleware con Supertest (rojo) |
| 5 | `backend/src/lib/vonageSignature.ts` | `checkVonageSignature`: JWT HS256 + `payload_hash` con `node:crypto` |
| 6 | `backend/src/lib/rawBody.ts` | `captureRawBody` + tipo `rawBody` en la petición |
| 7 | `backend/src/middleware/verifyVonageSignature.ts` | Middleware: 401 / 500 / `next()` + log sin secretos |
| 8 | `backend/src/app.ts` | `express.json({ verify: captureRawBody })` |
| 9 | `backend/AGENTS.md` | Añadir `middleware/` al mapa de carpetas (regla 14 de `AGENTS.md`) |
| 10 | — | `pnpm check` + `pnpm test` (evidencias para el PR) |

Sin dependencias nuevas. Sin cambios en `openapi.yaml` ni `schema.prisma`.

# A3 · POST /api/video-tokens — Plan de implementación

> Spec: [`02-specification.md`](./02-specification.md) · Issue: #9

## 1. Ficheros afectados

| Etiqueta | Fichero | Qué y por qué |
|---|---|---|
| `[MODIFY]` | `backend/src/repositories/incident.repo.ts` | Añadir a `IncidentRepo` el método `updateVideoSession(videoSessionId, data)` para guardar `vonageSessionId`, `status` y `startedAt` (RF-04, RF-06). Actualizar también el stub `InMemoryIncidentRepo`. **Fichero de X1: avisar a Miranda** |
| `[NEW]` | `backend/src/repositories/prisma-incident.repo.ts` | `PrismaIncidentRepo`: implementación real de `IncidentRepo` con Prisma (`findById` con `visit.videoSession`, `updateStatus`, `updateVideoSession`). Necesaria para que el endpoint funcione con la BD del seed |
| `[NEW]` | `backend/src/routes/video-tokens.ts` | `createVideoTokensRouter({ incidentRepo, videoService, applicationId })`: validación zod, orden 400 → 404 → 403 → 409, creación de sesión, token y paso a `ACTIVE` |
| `[MODIFY]` | `backend/src/app.ts` | `createApp(deps?)` acepta dependencias opcionales. Por defecto: `PrismaIncidentRepo` + `InMemoryVideoService` (hasta A1/A2) + `env.VONAGE_APPLICATION_ID`. Montar `app.use('/api', videoTokensRouter)` |
| `[NEW]` | `backend/src/__tests__/video-tokens.test.ts` | Tests de contrato con Supertest para CA-01 a CA-08 |
| `[MODIFY]` | `backend/openapi.yaml` | `description` del 409: añadir "o la sesión de vídeo está ENDED" |

## 2. Cambios en contrato y base de datos

- `openapi.yaml`: solo cambia una `description` (sin cambios de forma). Requiere aprobación de la mentora en el PR (AGENTS.md).
- `schema.prisma`: **sin cambios**. `VideoSession` ya tiene `vonageSessionId`, `status` y `startedAt`.
- Para probar en local: `pnpm db:push` + `pnpm db:seed`.

## 3. Estrategia de pruebas (TDD)

**Fase roja:** escribir primero `video-tokens.test.ts` con los 8 criterios. Todos fallan (la ruta no existe → 404 de Express).

**Fase verde:** implementar la ruta paso a paso hasta que pasen.

**Dobles de prueba:**
- `InMemoryIncidentRepo` con una incidencia tipo seed (`inc_demo`, `usr_tenant_demo`, `usr_technician_demo`). Cada test crea su propio repo para no compartir estado.
- `InMemoryVideoService` (stub de X1): no toca Vonage.
- `applicationId: 'test-app-id'` pasado directamente → los tests no dependen del `.env`.
- Sin Postgres ni red en los tests.

## 4. Orden de ejecución

1. Esperar a que T1 (#31) y X1 (#30) estén mergeados → `git merge main` en la rama.
2. Ampliar `IncidentRepo` + stub con `updateVideoSession` (y avisar a Miranda).
3. Escribir `video-tokens.test.ts` (fase roja). Ejecutar `pnpm test` → fallan.
4. Crear `video-tokens.ts`: schemas zod de headers y body → 400.
5. Añadir búsqueda de la incidencia → 404.
6. Añadir comprobación de permisos y rol → 403.
7. Añadir comprobación de estados → 409.
8. Añadir creación de sesión, token y paso a `ACTIVE` → 200.
9. Modificar `app.ts` para montar la ruta con dependencias inyectables.
10. Crear `PrismaIncidentRepo` y usarlo por defecto en `app.ts`.
11. Actualizar la `description` del 409 en `openapi.yaml`.
12. `pnpm check` + `pnpm test` en verde → `04-validation.md` → PR.

## 5. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| X1 (#30) no está mergeado y su interface puede cambiar en la revisión | Empezar a programar solo tras el merge; si cambia, adaptar el paso 2 |
| Romper `app.test.ts`, que usa `createApp()` sin parámetros | Las dependencias de `createApp` son **opcionales**, con valores por defecto |
| Tocar un fichero de X1 (`incident.repo.ts`) | Cambio mínimo (un método) y avisar a Miranda en el PR |
| `VONAGE_APPLICATION_ID` vacío en `.env` | La ruta devuelve 500 con un mensaje claro; en tests se inyecta un valor |
| Alcance mayor de lo previsto (A3 es talla S) | Si `PrismaIncidentRepo` complica el PR, separarlo en una tarea propia y dejar A3 solo con stubs |
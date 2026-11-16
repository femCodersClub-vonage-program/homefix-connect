# A3 · POST /api/video-tokens — Plan de implementación

> Spec: [`02-specification.md`](./02-specification.md) · Issue: #9

## 1. Ficheros afectados

| Etiqueta | Fichero | Qué y por qué |
|---|---|---|
| `[NEW]` | `backend/src/repositories/prisma-incident.repo.ts` | `PrismaIncidentRepo`: implementación real de `IncidentRepo` con Prisma (`findById` con `visit.videoSession`, `updateStatus`). Necesaria para que el endpoint funcione con la BD del seed |
| `[NEW]` | `backend/src/repositories/prisma-video-session.repo.ts` | `PrismaVideoSessionRepo`: implementación real de `VideoSessionRepo` (X1) con Prisma (`findByVisitId`, `findByVonageSessionId`, `update`) |
| `[NEW]` | `backend/src/routes/video-tokens.ts` | `createVideoTokensRouter({ incidentRepo, videoSessionRepo, videoService, applicationId })`: validación zod, orden 400 → 404 → 403 → 409, lazy-create con guard, token y paso a `ACTIVE` |
| `[MODIFY]` | `backend/src/app.ts` | `createApp(deps?)` acepta dependencias opcionales. Por defecto: `PrismaIncidentRepo` + `PrismaVideoSessionRepo` + `InMemoryVideoService` (hasta A2) + `env.VONAGE_APPLICATION_ID`. Montar `app.use('/api', videoTokensRouter)` |
| `[NEW]` | `backend/src/__tests__/video-tokens.test.ts` | Tests de contrato con Supertest para CA-01 a CA-09 |
| `[MODIFY]` | `backend/openapi.yaml` | `description` del 409: añadir "o la sesión de vídeo está ENDED" |

No se toca `incident.repo.ts` ni `video-session.repo.ts` (interfaces de X1).

## 2. Cambios en contrato y base de datos

- `openapi.yaml`: solo cambia una `description` (sin cambios de forma). Requiere aprobación de la mentora en el PR (AGENTS.md).
- `schema.prisma`: **sin cambios**. `VideoSession` ya tiene `vonageSessionId`, `status` y `startedAt`.
- Para probar en local: `pnpm db:push` + `pnpm db:seed`.

## 3. Guard de concurrencia

- Dentro de `createVideoTokensRouter` hay un `Map<videoSessionId, Promise<vonageSessionId>>`.
- Si la sesión no tiene `vonageSessionId`, se llama a `ensureVonageSession`: si ya hay una promesa para esa `VideoSession`, se reutiliza; si no, se crea (`createSession` + `VideoSessionRepo.update`) y se guarda en el `Map`.
- La promesa se queda guardada al terminar bien: así, una petición que leyó la BD antes del `update` tampoco crea otra sala. Si falla, se borra para poder reintentar.
- Limitación conocida: vive en memoria del proceso. Con varias instancias del backend haría falta un bloqueo en BD (post-MVP).

## 4. Estrategia de pruebas (TDD)

**Fase roja:** escribir primero `video-tokens.test.ts` con los criterios. Fallan (la ruta no existe → 404 de Express).

**Fase verde:** implementar la ruta paso a paso hasta que pasen.

**Dobles de prueba:**
- `InMemoryIncidentRepo` con una incidencia tipo seed (`inc_demo`, `usr_tenant_demo`, `usr_technician_demo`) e `InMemoryVideoSessionRepo` con su `VideoSession` (`vs_demo`). Cada test crea sus propios repos para no compartir estado.
- `InMemoryVideoService` (stub de X1): no toca Vonage. `vi.spyOn` sobre `createSession` para CA-09.
- `applicationId: 'test-app-id'` pasado directamente → los tests no dependen del `.env`.
- Sin Postgres ni red en los tests.

## 5. Orden de ejecución

1. Rebase de la rama sobre `main` (T1 #31 y X1 #30 ya mergeados).
2. Escribir `video-tokens.test.ts` (fase roja). Ejecutar `pnpm test` → fallan.
3. Crear `video-tokens.ts`: schemas zod de headers y body → 400.
4. Añadir búsqueda de la incidencia → 404.
5. Añadir comprobación de permisos y rol → 403.
6. Añadir comprobación de estados → 409.
7. Añadir lazy-create con guard (`VideoSessionRepo.update`), token y paso a `ACTIVE` → 200.
8. Modificar `app.ts` para montar la ruta con dependencias inyectables.
9. Crear `PrismaIncidentRepo` y `PrismaVideoSessionRepo` y usarlos por defecto en `app.ts`.
10. Actualizar la `description` del 409 en `openapi.yaml`.
11. `pnpm check` + `pnpm test` en verde con Node 24 → `04-validation.md` → PR.

## 6. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Dos peticiones simultáneas crean dos sesiones de Vonage | Guard en memoria (§3) + test CA-09 |
| Romper `app.test.ts`, que usa `createApp()` sin parámetros | Las dependencias de `createApp` son **opcionales**, con valores por defecto |
| `VONAGE_APPLICATION_ID` vacío en `.env` | La ruta devuelve 500 con un mensaje claro; en tests se inyecta un valor |
| Alcance mayor de lo previsto (A3 es talla S) | Los repos de Prisma son finos (una llamada por método); si complican el PR, se separan |

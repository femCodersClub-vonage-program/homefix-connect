# A2 · VideoService real — Plan de implementación

> Spec: [`02-specification.md`](./02-specification.md) · Issue: #8 · Escrito para la opción **B** de Q1

## 1. Ficheros afectados

| Etiqueta | Fichero | Qué y por qué |
|---|---|---|
| `[MODIFY]` | `backend/package.json` + `pnpm-lock.yaml` | Añadir `@vonage/server-sdk` |
| `[NEW]` | `backend/src/services/vonage-video.service.ts` | `VonageVideoService`, tipo `VonageVideoClient` y `createVonageVideoService(env)` |
| `[NEW]` | `backend/src/__tests__/vonage-video.service.test.ts` | Tests CA-01 a CA-06 con cliente mockeado |
| `[MODIFY]` | `backend/src/app.ts` | Usar `createVonageVideoService(env)` por defecto en lugar de `InMemoryVideoService` |
| `[MODIFY]` | `backend/src/config/env.ts` (si hace falta) | Leer `VONAGE_PRIVATE_KEY_PATH` como opcional |
| `[MODIFY]` | `docs/LOCAL_SETUP.md` / `README.md` | Cómo poner las credenciales de Vonage Video para probar en local |

Sin cambios en `video.service.ts` (interface X1), `openapi.yaml` ni `schema.prisma`.

## 2. Estrategia de pruebas (TDD)

**Fase roja:** escribir `vonage-video.service.test.ts` con CA-01 a CA-06 → fallan (el fichero del service no existe).

**Fase verde:** implementar el service hasta que pasen.

**Dobles de prueba:**
- Cliente falso: `{ createSession: vi.fn().mockResolvedValue({ sessionId: 'vonage-123' }), generateClientToken: vi.fn().mockReturnValue('tok-abc') }`.
- Reloj fijo inyectado (`now: () => 1_800_000_000_000`) para comprobar `expireTime` y `expiresAt` sin `vi.useFakeTimers`.
- Sin red, sin Postgres, sin `.env`.

## 3. Orden de ejecución

1. `pnpm --filter backend add @vonage/server-sdk` (Node 24) → commit `chore(A2): ...`.
2. Escribir los tests (rojo) → `pnpm test` falla → commit `test(A2): ...`.
3. Implementar `VonageVideoService` (createSession, generateToken, roles, errores) → verde → commit `feat(A2): ...`.
4. Implementar `createVonageVideoService(env)` y conectarlo en `app.ts`.
5. `pnpm test` completo: `video-tokens.test.ts` y `app.test.ts` siguen en verde.
6. Documentar credenciales en `LOCAL_SETUP.md`.
7. (Si hay credenciales) prueba manual con `pnpm dev`.
8. `pnpm check` + `pnpm test` con Node 24 → `04-validation.md` → PR `Closes #8`.

## 4. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| El SDK no se puede construir sin clave y rompe `app.test.ts` | Construcción perezosa en `createVonageVideoService`: sin credenciales no se instancia el SDK |
| `expireTime` en milisegundos en vez de segundos (token caducado o rechazado) | Test CA-02 comprueba el valor exacto en segundos |
| La clave privada acaba en logs | No se loguea la config; el mensaje de error no incluye rutas ni contenido |
| Los tipos del SDK no encajan con `VonageVideoClient` | El tipo es mínimo; si hace falta, se adapta con una función envoltorio |

## 5. Pendiente de la reunión

- Confirmar **Q1** (A o B) y **Q5** ("conexión forzada").
- Pedir `VONAGE_APPLICATION_ID` y `private.key` para la prueba manual.

## 6. Si se elige la opción A en Q1

- Constructor: `({ client, videoSessionRepo, ... })`.
- `createSession(visitId)`: buscar la `VideoSession` con `findByVisitId`; si ya tiene `vonageSessionId`, devolverlo; si no, crear + `update`, con el guard de concurrencia movido desde `routes/video-tokens.ts`.
- Quitar `ensureVonageSession` y el `update` de `vonageSessionId` de la ruta; adaptar `video-tokens.test.ts` (CA-09) para que el guard se pruebe en el service.
- Añadir CA de idempotencia y de concurrencia en `vonage-video.service.test.ts`.

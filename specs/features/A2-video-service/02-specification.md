# A2 · VideoService real (Vonage Video) — Especificación

> Issue: #8 (absorbe A1, #7) · Requisitos: [`01-requirements.md`](./01-requirements.md) · Interface: `backend/src/services/video.service.ts` (X1, #30)

## 1. Resumen y contexto

`feat(A2): VonageVideoService` — Closes #8.

Implementación real de la interface `VideoService` con el Server SDK de Vonage. Sustituye a `InMemoryVideoService` en la app. Hace dos cosas: crear la "sala" de vídeo en Vonage (`createSession`) y firmar el pase personal para entrar (`generateToken`). No sabe nada de HTTP: la ruta `POST /api/video-tokens` (A3, ya en `main` con #36) es quien lo usa.

## 2. Alcance

**Dentro de alcance**

- Clase `VonageVideoService` que cumple la interface `VideoService` de X1 (sin cambiar la interface).
- `createSession(visitId)` → crea una sesión de Vonage Video y devuelve `{ sessionId }`.
- `generateToken(sessionId, role)` → token con TTL de 1 h y `{ token, expiresAt }`.
- Cliente de Vonage inyectado en el constructor (mockeable).
- Dependencia `@vonage/server-sdk` en `backend/package.json`.
- `app.ts` usa `VonageVideoService` por defecto.
- Tests unitarios con el SDK mockeado (sin red ni credenciales).

**Fuera de alcance**

- Respuesta HTTP, 403/409 y paso a `ACTIVE` (A3, ya mergeado).
- Webhook `session.end` y paso a `ENDED` (A4).
- Grabación, archivado, broadcast.
- Cambios en `openapi.yaml` o en `schema.prisma`.

## 3. Requisitos funcionales

- **RF-01:** `VonageVideoService implements VideoService` en `src/services/vonage-video.service.ts`.
- **RF-02:** `createSession(visitId)` llama a `client.createSession({ mediaMode: RELAYED })` y devuelve `{ sessionId }` con el id real de Vonage.
- **RF-03:** `generateToken(sessionId, role)` llama a `client.generateClientToken(sessionId, { role: 'publisher', expireTime, data })` y devuelve `{ token, expiresAt }`.
- **RF-04:** `expireTime` = ahora + 3600 s, en **segundos** (timestamp Unix). `expiresAt` es el mismo instante como `Date`.
- **RF-05:** `data` = `JSON.stringify({ role })` para identificar la conexión en el cliente (pendiente Q5).
- **RF-06:** El cliente se construye con `VONAGE_APPLICATION_ID` + `VONAGE_PRIVATE_KEY_PATH`. Si falta alguno, el error salta **al llamar** al service (→ 500 en la ruta), no al arrancar la app (Q3).
- **RF-07:** `app.ts` usa `VonageVideoService` por defecto; los tests siguen pudiendo inyectar `InMemoryVideoService`.

## 4. Reglas de negocio

- **RN-01:** Rol de Vonage `publisher` para `TENANT` y `TECHNICIAN` (llamada 1-a-1, nadie modera). `MANAGER` nunca llega aquí: A3 lo corta con 403. Si llegara, el service lanza error.
- **RN-02:** `mediaMode: relayed` (P2P, ARCHITECTURE "media P2P").
- **RN-03:** La clave privada nunca sale del backend ni aparece en logs (AGENTS.md §6).
- **RN-04:** Una `VideoSession` tiene como máximo una sesión de Vonage. **Quién lo garantiza depende de Q1** (ver §10).

## 5. Contrato (interface X1, sin cambios)

```ts
createSession(visitId: string): Promise<{ sessionId: string }>;
generateToken(sessionId: string, role: Role): Promise<{ token: string; expiresAt: Date }>;
```

## 6. Manejo de errores

| Situación | Comportamiento |
| --- | --- |
| Falta `VONAGE_APPLICATION_ID` o `VONAGE_PRIVATE_KEY_PATH` | Lanza `Error('Credenciales de Vonage Video no configuradas')` al llamar → la ruta responde 500 |
| El SDK falla (red, credenciales inválidas) | Se propaga el error (sin la clave en el mensaje) → 500 |
| `role` no es `TENANT` ni `TECHNICIAN` | Lanza error → 500 (no debería pasar por A3) |

## 7. Casos límite

- `generateToken` dos veces para la misma sesión → dos tokens distintos y válidos (es lo normal: uno por persona).
- `sessionId` vacío → error del SDK, se propaga.
- La app arranca sin `.env` de Vonage → arranca bien; solo falla `POST /api/video-tokens` con 500.

## 8. Criterios de aceptación

**CA-01 · Crea la sesión**
- **Given** un cliente de Vonage mockeado que devuelve `{ sessionId: 'vonage-123' }`
- **When** `createSession('visit_demo')`
- **Then** devuelve `{ sessionId: 'vonage-123' }` y el cliente se llamó una vez con `mediaMode: relayed`

**CA-02 · Token con TTL de 1 h**
- **Given** reloj fijado en `T` y cliente que devuelve `'tok-abc'`
- **When** `generateToken('vonage-123', 'TENANT')`
- **Then** `{ token: 'tok-abc', expiresAt: T + 1 h }` y `expireTime` = `floor(T/1000) + 3600`

**CA-03 · Rol de Vonage** → `TENANT` y `TECHNICIAN` → `role: 'publisher'`; `data` incluye el rol
**CA-04 · Rol no permitido** → `MANAGER` → lanza error, no llama al SDK
**CA-05 · Sin credenciales** → service creado sin `applicationId` → `createSession` y `generateToken` lanzan error claro
**CA-06 · Error del SDK** → el cliente rechaza → el error se propaga
**CA-07 · Integración con A3** → `video-tokens.test.ts` sigue en verde sin cambios (usa stubs)

## 9. Diseño técnico

- `src/services/vonage-video.service.ts`:
  - Tipo mínimo `VonageVideoClient = { createSession(opts): Promise<{ sessionId: string }>; generateClientToken(sessionId, opts): string }` (lo que usamos del SDK; fácil de mockear).
  - `class VonageVideoService implements VideoService`, constructor `({ client, ttlSeconds = 3600, now = () => Date.now() })`.
  - `createVonageVideoService(env)`: si hay credenciales, crea `new Vonage(new Auth({ applicationId, privateKey: path }))` y pasa `vonage.video` como cliente; si no, un cliente que lanza el error de RF-06.
- `src/app.ts`: `deps.videoService ?? createVonageVideoService(env)`.
- `mediaMode`: en `@vonage/video` (v1.32) `MediaMode.RELAYED` vale `'enabled'` y **el valor por defecto es `ROUTED`**, así que hay que pasarlo explícitamente. `@vonage/server-sdk` no reexporta el enum: se usa el literal `'enabled'` con un comentario, o se añade `@vonage/video` como dependencia.
- `generateClientToken` del SDK es **síncrono** (devuelve string); el service lo envuelve en la `Promise` de la interface.

## 10. Pregunta abierta clave — Q1: ¿quién guarda el `vonageSessionId`?

El issue dice que lo guarda el service y que es idempotente. Pero **A3 (#36) ya está en `main`** y la ruta ya hace `createSession` + `VideoSessionRepo.update` con el guard de concurrencia (test CA-09).

| Opción | Qué implica | Pros | Contras |
| --- | --- | --- | --- |
| **A** · El service persiste | Inyectar `VideoSessionRepo` en el service, mover el guard, quitar el `update` de la ruta y ajustar `video-tokens.test.ts` | Cumple el issue al pie de la letra; idempotencia en un solo sitio | Toca código ya mergeado de A3 dentro del PR de A2; PR más grande |
| **B** · El service solo habla con Vonage | Nada cambia en A3; el service es un adaptador puro | PR pequeño, no toca A3, service más fácil de testear; la idempotencia ya está cubierta por A3 (CA-09) | Hay que actualizar el criterio del issue #8 |

**Recomendación ahora:** **B**, porque A3 ya está mergeado y cubre la idempotencia. Además, en el refinamiento del issue #9 (PR #34) se acordó que **A3 mantiene P3**: si `vonageSessionId` es `null`, la ruta crea la sesión con `VideoService.createSession`, la guarda y aplica el guard de concurrencia. Falta confirmar que esto sustituye al criterio del issue #8 («`createSession` persiste e idempotente»). Esta spec está escrita para B; si se elige A, se añade `VideoSessionRepo` al constructor y se mueve el guard (ver `03-plan.md` §6).

## 11. Resto de preguntas (de `01-requirements.md`)

| # | Propuesta en esta spec |
| --- | --- |
| Q2 | TTL 3600 s |
| Q3 | 500 en la petición, la app arranca sin credenciales |
| Q4 | `publisher` para las dos |
| Q5 | "Conexión forzada" = `data` con el rol. **Hay que confirmar qué significa** |
| Q6 | `relayed` |
| Q7 | `@vonage/server-sdk` |

## 12. Estrategia de pruebas

- **Unit (Vitest):** `vonage-video.service.test.ts`, un test por CA-01 a CA-06, con un cliente falso (`vi.fn()`) y reloj fijo. Sin red, sin `.env`.
- **Regresión:** `pnpm test` completo (CA-07).
- **Manual (opcional, con credenciales):** `pnpm dev` + `POST /api/video-tokens` con el seed → devuelve un `sessionId` real de Vonage.

## 13. Dependencias

- **Hard:** X1 (#30) y A3 (#36) en `main`.
- **Credenciales** (solo para la prueba manual): `VONAGE_APPLICATION_ID` y `private.key`.
- **Desbloquea:** C3/C4 (videollamada real en el front) y A4.

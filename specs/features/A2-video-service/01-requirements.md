# A2 · VideoService real (Vonage Video) — Requisitos

> Issue: #8 (absorbe A1, #7) · Rama: `feat/A2-video-service` · Interface: `backend/src/services/video.service.ts` (X1)

## 1. Requisitos clasificados

### Explícitos (issue #8, comentario de refinamiento, `backend/AGENTS.md`)

| ID   | Requisito | Fuente |
| ---- | --------- | ------ |
| E-01 | Implementación real de la interface `VideoService` (X1) con el Server SDK de Vonage | Issue #8 |
| E-02 | `createSession(visitId)` crea la sesión en Vonage y persiste el `vonageSessionId` con `VideoSessionRepo.update`; el estado sigue `PENDING` | Issue #8 |
| E-03 | `createSession` es idempotente: si la visita ya tiene `vonageSessionId`, devuelve el existente sin crear otra | Issue #8 |
| E-04 | `generateToken(sessionId, role)` firma un token con TTL corto (1 h), con rol y conexión forzada; devuelve `{ token, expiresAt }` | Issue #8 |
| E-05 | `role` ∈ { `TENANT`, `TECHNICIAN` } (enum `Role`) | Issue #8 |
| E-06 | Credenciales desde `VONAGE_APPLICATION_ID` y `VONAGE_PRIVATE_KEY_PATH`; la clave privada nunca sale del backend | Issue #8 · AGENTS.md §6 |
| E-07 | Tests unitarios con el SDK mockeado: creación + persistencia, idempotencia y token | Issue #8 |
| E-08 | La respuesta HTTP `{ applicationId, sessionId, token }` y los 403/409 son de A3 (#9), no del service | Issue #8 |
| E-09 | El SDK ya está en el stack (`backend/AGENTS.md` §1): no requiere ADR | Comentario de refinamiento |

### Derivados

| ID   | Requisito | Justificación |
| ---- | --------- | ------------- |
| D-01 | El service no importa `express` ni sabe de HTTP | `backend/AGENTS.md` (capa `services/`) |
| D-02 | El cliente de Vonage se inyecta en el constructor para poder mockearlo en tests | AGENTS.md §6: "toda llamada a Vonage detrás de un service testeable con mocks" |
| D-03 | Hay que añadir la dependencia del SDK a `backend/package.json` (hoy no está) | `backend/package.json` |
| D-04 | `app.ts` usa `VonageVideoService` por defecto en lugar de `InMemoryVideoService` | Issue #8 ("sustituye InMemoryVideoService") |

## 2. Hallazgos al revisar la documentación del SDK

Según la documentación oficial del Vonage Video Node SDK (developer.vonage.com/en/video/server-sdks/node):

- Los métodos reales son `vonage.video.createSession(...)` y `vonage.video.generateClientToken(sessionId, options)`. El issue los nombra `video.sessions.create` / `video.sessions.generateToken`, que no coinciden.
- El cliente se autentica con `applicationId` + `privateKey`; `VONAGE_API_KEY` / `VONAGE_API_SECRET` no hacen falta para Video.
- Los roles del token de Vonage son `publisher`, `subscriber` y `moderator`. Hay que mapear `TENANT` / `TECHNICIAN` a uno de ellos.
- `expireTime` va en segundos (timestamp Unix) y `data` permite meter metadatos de la conexión.

## 3. Desconocidos (preguntas para el issue)

| #  | Pregunta | Opciones | Recomendación |
| -- | -------- | -------- | ------------- |
| Q1 | ¿Quién persiste el `vonageSessionId`: el service o la ruta? Hoy A3 (#36) ya hace `createSession` + `VideoSessionRepo.update` con el guard de concurrencia en la ruta | A) El service persiste y es idempotente (como dice el issue) y A3 deja de hacer el `update` y el guard se mueve al service · B) El service solo llama a Vonage y la ruta persiste (como está A3) | **A**, para cumplir el criterio del issue y tener la idempotencia en un único sitio. Implica un pequeño ajuste en A3 cuando se mergee A2. **✅ Decidido (reunión 17/11): B**: A3 ya está mergeado y cubre la idempotencia (CA-09) |
| Q2 | TTL del token | 3600 s (recomendado en el issue) | **3600 s** |
| Q3 | Si falta `VONAGE_APPLICATION_ID` o el `private.key` | A) Fallar al arrancar · B) 500 en la petición | **B**: `.env.example` dice que la app arranca sin credenciales y A3 ya documenta el 500 |
| Q4 | Rol de Vonage para `TENANT` y `TECHNICIAN` | `publisher` para las dos · `moderator` para la técnica | **`publisher` para las dos** (llamada 1-a-1, nadie expulsa a nadie) |
| Q5 | ¿Qué es "conexión forzada" en el criterio del token? | A) Meter en `data` el `userId` y el `role` para identificar la conexión · B) Otra cosa | Preguntar. Si es A: `data: JSON.stringify({ userId?, role })` |
| Q6 | `mediaMode` de la sesión | `relayed` (por defecto, P2P) · `routed` | **`relayed`** (MVP 1-a-1, ARCHITECTURE: "media P2P") |
| Q7 | Paquete npm | `@vonage/server-sdk` (+ `@vonage/video`) · otro | **`@vonage/server-sdk`** (el que indica la doc oficial) |

## 4. Decisiones de Clarificación Acordadas

_Pendiente de respuesta en el issue #8._

## 5. Fuera de alcance

- Respuesta HTTP, validación 403/409 y estados `ACTIVE`/`ENDED` (A3, A4).
- Webhooks de vídeo (A4).
- Grabación, archivado, broadcast.

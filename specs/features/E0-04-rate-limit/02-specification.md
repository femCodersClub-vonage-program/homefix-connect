# E0-04 · Rate limit en `POST /api/video-tokens` — Especificación

> Issue: #63 · Rama: `fix/E0-04-rate-limit` · Requisitos: `01-requirements.md` (Q1–Q4 = A, 25/11)

## 1. Comportamiento

- Middleware `rateLimitByUser({ max, windowMs, now? })` en `src/middleware/rateLimitByUser.ts`, montado **solo** en `POST /video-tokens`, antes de validar nada.
- Clave: `X-User-Id` (sin espacios). Sin cabecera o vacía → no cuenta y pasa a la ruta, que responde 400 como antes (Q2).
- Ventana **fija** por usuario: la primera petición abre una ventana de `windowMs`; cuenta todas las peticiones con usuario, acaben en 200, 403, 404 o 409 (Q3, Q4).
- Petición `max + 1` dentro de la ventana → **429** `{ error }` + cabecera `Retry-After` = segundos que faltan (mínimo 1) + log `warn` con `userId` y `path`.
- Store: `Map` en memoria creado por cada `createApp()` (una instancia de backend; los tests no se pisan).

## 2. Configuración (Q1)

| Variable | Por defecto | Dónde |
| -------- | ----------- | ----- |
| `VIDEO_TOKENS_RATE_LIMIT_MAX` | `10` | `env.ts` + `.env.example` |
| `VIDEO_TOKENS_RATE_LIMIT_WINDOW_MS` | `60000` | `env.ts` + `.env.example` |

`AppDeps.videoTokensRateLimit` permite a los tests inyectar otro límite y un reloj falso.

## 3. Contrato

`openapi.yaml`: respuesta `429` en `POST /api/video-tokens` con cabecera `Retry-After` (integer ≥ 1) y cuerpo `Error`. Tipos del frontend regenerados.

## 4. Tests

| ID | Dónde | Qué |
| -- | ----- | --- |
| RL-1…RL-6 | `src/__tests__/rate-limit-by-user.test.ts` | Hasta `max` pasa · `max+1` → 429 + `Retry-After` exacto · reinicio de ventana · contador por usuario · sin usuario no limita · `Retry-After` ≥ 1 |
| CA-10…CA-13 | `tests/contract/video-tokens.contract.test.ts` | Petición 11 → 429 · límite por usuario · cuentan los 409 · sin `X-User-Id` sigue siendo 400 |

## 5. Fuera de alcance

Redis, otros endpoints, límite por IP. Limpieza de ventanas caducadas: no hace falta en el MVP (un puñado de usuarios demo).

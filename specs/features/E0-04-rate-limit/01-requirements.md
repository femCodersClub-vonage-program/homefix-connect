# E0-04 · Rate limit en `POST /api/video-tokens` — Requisitos

> Issue: #63 · Asignada a Caro-it (25/11) · Rama: `fix/E0-04-rate-limit` · Depende de: ninguna
> Base: `docs/MVP_EXTENDED.md` §5.1 y §6 · análisis previo de la I2 (#24, `specs/features/I2-edge-cases/01-requirements.md` en la rama `feat/I2-edge-cases`)

## 1. Requisitos

### Explícitos (issue #63)

| ID | Requisito |
| -- | --------- |
| E-01 | Límite **configurable**, por ejemplo 10 peticiones/min por usuario |
| E-02 | Si se pasa: **429** con cabecera `Retry-After` |
| E-03 | Tests unitarios + de contrato con el 429 |
| E-04 | `openapi.yaml` actualizado con el 429 en `POST /video-tokens` |
| E-05 | Middleware de Express con store **en memoria**; clave = `X-User-Id` |

### Derivados

| ID | Requisito | Justificación |
| -- | --------- | ------------- |
| D-01 | **No por IP**: con ngrok todas las peticiones llegan desde la misma IP | I1 |
| D-02 | **Solo** `POST /video-tokens`. Ni webhooks (Vonage manda ráfagas, ya los protege la firma X3, y un 429 provocaría reintentos) ni `GET /incidents/:id` (la C5 hace polling cada 5 s) | I1 · X3 · C5 |
| D-03 | **Sin dependencia nueva** (`express-rate-limit`): una dependencia necesita aprobación (AGENTS §12) y el issue pide un middleware propio | AGENTS §12 · #63 |
| D-04 | Store en memoria del proceso: vale para el MVP con una sola instancia (igual que el guard de la A3) | A3 · ARCHITECTURE |
| D-05 | Cuerpo del 429 = `{ error }` como el resto de errores | AGENTS §11 |
| D-06 | Los tests inyectan la configuración y el reloj para no esperar un minuto real | Tests rápidos y deterministas |

## 2. Preguntas de clarificación

| # | Pregunta | Opciones | Propuesta |
| - | -------- | -------- | --------- |
| Q1 | ¿Cómo se configura el límite? | A) Variables de entorno `VIDEO_TOKENS_RATE_LIMIT_MAX` (10) y `VIDEO_TOKENS_RATE_LIMIT_WINDOW_MS` (60000) en `env.ts` + `.env.example` · B) Constante en el código | **A** («configurable» en el issue) |
| Q2 | Una petición **sin** `X-User-Id` válido, ¿cuenta para el límite? | A) No: pasa y la ruta responde 400 como ahora · B) Se cuenta por IP | **A**: no hay usuario que limitar y el 400 ya la corta |
| Q3 | ¿Cuentan también las peticiones que acaban en 403/404/409? | A) Sí, todas las que llegan con `X-User-Id` · B) Solo las que generan token | **A**: es lo que frena el abuso y es lo más simple |
| Q4 | Tipo de ventana | A) Fija (contador que se reinicia cada minuto) · B) Deslizante | **A**: más simple; suficiente para el MVP |

## 3. Fuera de alcance

- Redis o store compartido entre instancias.
- Rate limit en otros endpoints.
- Bloqueo por IP o listas negras.

## 4. Decisiones de clarificación acordadas

_Pendiente de respuesta._

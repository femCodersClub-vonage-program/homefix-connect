# I2 · Edge cases + demo (best effort) — Requisitos

> Issue: #24 · Asignada a Caro-it (25/11) · Rama sugerida: `feat/I2-edge-cases` (desde `main` cuando se mergee el #52) · Depende de: I1 (#52, en review)

## 1. Requisitos clasificados

### Explícitos (issue #24 + `docs/`)

| ID   | Requisito | Fuente |
| ---- | --------- | ------ |
| E-01 | Cubrir, «en la medida de lo posible», **reconexión**, **sesión ya `ENDED`** y **rate limit** | Issue #24 |
| E-02 | **Demo grabada** del flujo completo | Issue #24 · `SDD_PLAN.md` semana 4 |
| E-03 | Anotar decisiones en el issue y actualizar contrato/schema en el mismo PR si aplica | Issue #24 |
| E-04 | Es *best effort*: lo que no dé tiempo se documenta, no bloquea el MVP | `TASKS.md` (I2, tamaño S) |

### Estado actual de cada caso (revisión del código, 25/11)

| Caso | Backend | Frontend |
| ---- | ------- | -------- |
| **Sesión `ENDED`** | ✅ `POST /video-tokens` → **409** si la incidencia no está en `VISIT_ASSIGNED`, la visita no está `CONFIRMED` o la sesión está `ENDED`. `sessionDestroyed` repetido → `already_processed` (probado en la I1). Tests: contract CA-07/CA-08 e integración INT-V8 | ✅ `IncidentDetail` traduce el 409 a «La videollamada ya no está disponible.». Con la C5 (#51) el botón queda en «Visita realizada» |
| **Reconexión** | Nada que hacer en el backend: la sesión de Vonage sigue viva mientras quede alguien | ⚠️ `useVideoCall` no escucha `sessionReconnecting` / `sessionReconnected`. Además, `handleConnectionDestroyed` y `streamDestroyed` del remoto **terminan la llamada también para quien sigue conectada**: si la otra persona pierde la red un momento, la llamada se acaba para las dos |
| **Rate limit** | ❌ No hay ninguno | — |
| **Colgar** | — | ⚠️ No hay botón: en la I1 se colgó cerrando la pestaña |

### Derivados

| ID   | Requisito | Justificación |
| ---- | --------- | ------------- |
| D-01 | El rate limit **no puede ir por IP**: con ngrok todas las peticiones llegan desde la misma IP. Se limita por `X-User-Id` (auth simulada) | Arquitectura de la I1 |
| D-02 | El rate limit **no puede afectar al polling de la C5**: `GET /api/incidents/:id` cada 5 s por pestaña | PR #51 |
| D-03 | El rate limit **no se pone en los webhooks**: Vonage manda ~10 eventos por llamada en ráfaga, ya están protegidos por la firma (X3) y si se responde 429 Vonage reintenta | I1 (consola de ngrok) · X3 |
| D-04 | Un corte de red de las dos personas a la vez dispara `sessionDestroyed` → la incidencia pasa a `VIDEO_COMPLETED` y salen los SMS aunque la visita no haya terminado de verdad | A4 · I1 |
| D-05 | Una dependencia nueva (p. ej. `express-rate-limit`) necesita aprobación del equipo | `AGENTS.md` §12 |
| D-06 | Para que la demo muestre el aviso «Visita finalizada», la C5 (#51) tiene que estar en `main` | PR #51 |

## 2. Preguntas de clarificación (pendientes — sync 25/11)

| #   | Pregunta | Opciones | Propuesta |
| --- | -------- | -------- | --------- |
| Q1  | ¿Qué entra en la I2? | A) Los 3 casos + demo · B) Solo backend (rate limit) + demo; frontend aparte | **A**, repartiendo el frontend (Q3) |
| Q2  | ¿Cómo se hace el rate limit? | A) `express-rate-limit` (dependencia nueva) · B) Middleware propio pequeño en memoria, sin dependencias · C) No se hace, se documenta | **A** si el equipo lo aprueba; si no, **B** |
| Q3  | ¿Quién hace la parte de frontend (reconexión y botón de colgar)? | A) Miranda (carril C) · B) Carolina, con review de Miranda | Decidir en el sync |
| Q4  | ¿Dónde y cuánto se limita? | — | Solo `POST /api/video-tokens`, por `X-User-Id`: **10 peticiones/min** → `429 { error }`. Ni webhooks (D-03) ni `GET /incidents` (D-02) |
| Q5  | ¿Hay que añadir el 429 a `openapi.yaml`? | A) Sí · B) No | **A**: es una respuesta nueva del contrato (E-03). Lo aprueba el equipo (§12) |
| Q6  | Reconexión: ¿qué comportamiento? | — | `sessionReconnecting` → «Reconectando…»; `sessionReconnected` → vuelve a «Conectada»; si el **remoto** se va, se queda esperando («Esperando a la otra persona…») en vez de terminar la llamada |
| Q7  | ¿Se acepta D-04 (corte de red de las dos = visita terminada)? | A) Sí, se documenta como limitación · B) Se cambia la lógica | **A**: cambiarlo afecta a A4/B3 y no da tiempo |
| Q8  | ¿Botón «Colgar»? | A) Sí, en la I2 · B) Fuera | **A** si lo asume quien haga el frontend; la demo queda mucho mejor |
| Q9  | Demo: ¿cómo se graba y dónde se guarda? | — | Carolina, siguiendo `LOCAL_SETUP.md` §14, 2–3 min con pantalla + SMS en el móvil (Xbox Game Bar, `Win + Alt + R`). **No en el repo** (peso): enlace en el issue |
| Q10 | ¿Se espera a la C5 (#51) para grabar? | A) Sí · B) No | **A** (D-06) |

## 3. Fuera de alcance

- Autenticación real (sigue la simulada con `X-User-Id` / `X-User-Role`).
- Reintentos de SMS (ADR-012) y estados de entrega (B4).
- Cámara trasera en móvil (C7).
- E2E automatizado con Playwright.

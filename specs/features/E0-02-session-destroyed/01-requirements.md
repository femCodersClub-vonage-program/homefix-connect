# E0-02 · Endurecer `sessionDestroyed` — Requisitos

> Issue: #61 · Asignada a Caro-it (25/11) · Rama: `fix/E0-02-session-destroyed`
> Depende de: **E1-01** (hard, según el issue: contrato de `video-events`) · E1-02 (soft)
> Base: `docs/MVP_EXTENDED.md` §3.3 y §4.3 · spec de la A4 (`specs/features/A4-video-webhook/`)

## 1. Requisitos

### Explícitos (issue #61)

| ID | Requisito |
| -- | --------- |
| E-01 | Idempotente: mismo `sessionId` ya cerrado → 200 `{ status: 'already_processed' }` |
| E-02 | Cierra `VideoSession` → `ENDED` **aunque la visita/incidencia ya esté completada** |
| E-03 | `reason = serverRotation` → no toca la visita |
| E-04 | Sesión desconocida → **200 `{ status: 'ignored' }`** (hoy 400, y Vonage reintenta) + log `warn` |
| E-05 | No duplica SMS si la visita ya se completó |
| E-06 | Tests de contrato + integración |
| E-07 | Errores: 400 payload inválido, 401 firma, 500 BD |

### Estado actual (A4, `backend/src/routes/video-events.ts`)

| Caso | Hoy | Con E0-02 |
| ---- | --- | --------- |
| Sesión desconocida | 400 `Unknown session` | 200 `ignored` + `warn` |
| Sesión `ENDED` | 200 `already_processed` | Igual |
| Sesión `ACTIVE` pero incidencia ya `VIDEO_COMPLETED` | 200 `already_processed` **sin cerrar la sesión** ❌ | Sesión → `ENDED`, **sin SMS** |
| `reason = serverRotation` | Cierra todo y manda SMS | No toca la visita (ver Q1) |
| Resto | Sesión `ENDED` + incidencia `VIDEO_COMPLETED` + SMS | Igual |

### Derivados

| ID | Requisito | Justificación |
| -- | --------- | ------------- |
| D-01 | **No** se marca `Visit.COMPLETED` aquí: la red de seguridad (visita `CONFIRMED` + sesión que estuvo `ACTIVE`) es la **E1-04** | §6 (E1-04) · evita pisarse |
| D-02 | Se cambian RF-5 y RF-6 de la spec de la A4; se actualiza su `02-specification.md` o se referencia esta | Trazabilidad |
| D-03 | `serverRotation` es uno de los `reason` documentados (`tests/fixtures/vonage-video/README.md`) | Fixtures oficiales |
| D-04 | Si E1-01 añade `video-events` a `openapi.yaml`, el contract test valida las respuestas nuevas (`ignored`) | Q1 de la E1-01 |

## 2. Preguntas de clarificación

| # | Pregunta | Opciones | Propuesta |
| - | -------- | -------- | --------- |
| Q1 | Con `reason = serverRotation`, ¿se cierra la `VideoSession`? | A) No se toca nada → 200 `ignored` · B) Se cierra la sesión pero no la visita ni los SMS | **A**: con una rotación de servidor la gente puede reconectar; cerrar la sesión bloquearía nuevos tokens (409). ⚠️ No he confirmado en la doc de Vonage qué pasa exactamente tras un `serverRotation` |
| Q2 | Sesión `ACTIVE` con incidencia ya `VIDEO_COMPLETED`: ¿qué responde? | A) 200 `{ status: 'session_closed' }` · B) 200 `{ status: 'already_processed' }` | **B**: no añade un estado nuevo al contrato; el log distingue el caso |
| Q3 | ¿Empezamos ya aunque E1-01 no esté mergeada? | A) Sí, el código no depende del schema nuevo; el contrato se ajusta al rebasar · B) Esperar a E1-01 | **A**: E0-02 no usa `completedAt` ni campos nuevos |

## 3. Fuera de alcance

- Red de seguridad que completa la visita (E1-04).
- `visit-status` (E1-02).
- Reintentos de SMS, B4.

## 4. Decisiones de clarificación acordadas

Respondidas por Carolina el 25/11: **Q1 = A, Q2 = B, Q3 = A** (las propuestas).

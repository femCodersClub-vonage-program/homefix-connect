# E0-02 · Endurecer `sessionDestroyed` — Especificación

> Issue: #61 · Rama: `fix/E0-02-session-destroyed` · Requisitos: `01-requirements.md` (Q1 = A, Q2 = B, Q3 = A; 25/11)
> Cambia RF-5 y RF-6 de la A4 (`specs/features/A4-video-webhook/02-specification.md`).

## 1. Flujo de `sessionDestroyed` (en orden)

| # | Condición | Efecto | Respuesta |
| - | --------- | ------ | --------- |
| 1 | `reason = serverRotation` | Nada (Q1) · log `info` | 200 `ignored` |
| 2 | `sessionId` sin `VideoSession` | Nada · log `warn` | **200 `ignored`** (antes 400) |
| 3 | Sesión ya `ENDED` | Nada | 200 `already_processed` |
| 4 | Siempre a partir de aquí | `VideoSession` → `ENDED` + `endedAt` | — |
| 5 | Incidencia ≠ `VISIT_ASSIGNED`, visita ≠ `CONFIRMED` o sesión que no llegó a `ACTIVE` | Solo el paso 4, **sin SMS** · log `info` con los estados | 200 `already_processed` (Q2) |
| 6 | Resto (visita abierta) | Incidencia → `VIDEO_COMPLETED` + `sendPostVisit` (como la A4) | 200 `processed` |

Sin cambios: firma (401), payload inválido (400), otros eventos (`ignored`), fallo de SMS (200 + log `error`).

**No** marca `Visit.COMPLETED`: la red de seguridad es la E1-04.

## 2. Contrato

`POST /api/webhooks/video-events` lo documenta la E1-01 (`WebhookAck`: `processed | already_processed | ignored`). Esta rama no toca `openapi.yaml` (Q3).

## 3. Tests

| Dónde | Cambios |
| ----- | ------- |
| `src/__tests__/video-events.test.ts` y `tests/contract/video-events.contract.test.ts` | CA-4 → 200 `ignored` · CA-7 → la sesión queda `ENDED` · `serverRotation` sale de los reason que cierran · nuevos: `serverRotation` ignorado, visita `COMPLETED`/`CANCELLED`, incidencia `CLOSED`, sesión `PENDING` |
| `tests/integration/video-events.int.test.ts` | INT-V11 → 200 `ignored` · nuevos INT-V14 (incidencia ya `VIDEO_COMPLETED` → sesión `ENDED` sin SMS) e INT-V15 (`serverRotation`) |

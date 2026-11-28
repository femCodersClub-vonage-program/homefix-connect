# E2-01 · `POST /api/webhooks/message-status` (B4) — Especificación

> Issue: #71 · Rama: `feat/E2-01-message-status` (**apilada sobre `feat/E2-02-notification-status` → `spec/E1-01-visit-lifecycle`**) · Asignada a Caro-it (26/11)
> Contrato: E1-01 (#77) · Lógica de estados: E2-02 (#72) · Base: `docs/MVP_EXTENDED.md` §4.4

## 1. Comportamiento

`createMessageStatusRouter({ notificationStatusService, getSignatureSecret })` en `src/routes/message-status.ts`, montado en `app.ts` bajo `/api`.

| # | Caso | Respuesta |
| - | ---- | --------- |
| 1 | Firma ausente o inválida (X3: JWT HS256 + `payload_hash`) | 401 `{ error: 'Invalid signature' }` |
| 2 | Secreto no configurado | 500 (X3) |
| 3 | Falta `message_uuid`, `status` o `timestamp` | 400 `{ error: 'Invalid payload' }` |
| 4 | `NotificationStatusService.applyStatus` (E2-02) | 200 `{ status: processed \| already_processed \| ignored }` |
| 5 | Error de base de datos | 500 (errorHandler) → Vonage reintenta |

- `error.title` / `error.detail` aceptan texto **o número** (Vonage manda códigos como `1340`).
- Solo se toca `Notification`; nunca `Incident` ni `Visit` (§4.1).
- `AppDeps.notificationRepo` (nuevo): el mismo repo lo usan el aviso post-visita (B3) y el webhook; los tests inyectan uno en memoria.

## 2. Tests

| ID | Dónde | Qué |
| -- | ----- | --- |
| MS-1…MS-9 | `tests/contract/message-status.contract.test.ts` | 401 (sin firma / otro secreto) · delivered → DELIVERED + `deliveredAt` · rejected con `title` numérico → FAILED · repetido → `already_processed` · fuera de orden no retrocede · UUID desconocido → `ignored` · 400 por campo · 500 BD · 500 sin secreto |
| INT-M1…INT-M3 | `tests/integration/message-status.int.test.ts` | Flujo real B3 → B4 (sessionDestroyed crea las 2 Notification y `delivered` actualiza una) · rejected → FAILED → delivered · UUID desconocido |

Payloads de ejemplo en `tests/fixtures/vonage-messages/` con la estructura de los callbacks de Vonage Messages (⚠️ no copiados literalmente de la documentación oficial: revisar con un callback real).

## 3. Validación (26/11)

```text
$ pnpm check   → sin errores
$ pnpm test    → backend 14 files · 178 passed · frontend 6 files · 54 passed
$ pnpm build   → OK
```

Pendiente: integración con Postgres (CI) y un callback real de Vonage con ngrok (configurar la *Status URL* de la aplicación de Messages a `/api/webhooks/message-status`).

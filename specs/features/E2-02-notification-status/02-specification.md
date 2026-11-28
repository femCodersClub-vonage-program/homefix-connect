# E2-02 · Repo y servicio de estados de notificación (B4) — Especificación

> Issue: #72 · Rama: `feat/E2-02-notification-status` (**apilada sobre `spec/E1-01-visit-lifecycle`, #77**) · Asignada a Caro-it (26/11)
> Base: `docs/MVP_EXTENDED.md` §4.4 · D9 · issue #72

## 1. Decisiones (Carolina, 26/11: «sigue resolviendo, déjalo in progress»)

- **Orden E2-02 → E2-01** (el issue dice al revés): el webhook (E2-01) usa este repo y este servicio, así que va primero la capa de datos. E2-01 se apila sobre esta rama.
- La lógica de estados vive en un **servicio** (`NotificationStatusService`), no en la ruta: se prueba sin Express ni Postgres (backend/AGENTS §3).
- Estado de Vonage **desconocido** → `ignored` (no 400): Vonage puede mandar otros estados y no queremos reintentos.

## 2. Repo (`NotificationRepo`)

| Método | Qué hace |
| ------ | -------- |
| `findByProviderMessageId(uuid)` | `Notification` por `message_uuid` (unique de E1-01) o `null` |
| `updateStatus(id, { status, deliveredAt?, error? })` | Cambia solo los campos que se pasan |

Implementado en `InMemoryNotificationRepo` y `PrismaNotificationRepo`. **Sin tocar** `create` / `existsForIncident` ni `MessagingPostVisitNotifier` (B3).

## 3. Servicio (`NotificationStatusService.applyStatus`)

| Vonage | → `NotificationStatus` | Extra |
| ------ | ---------------------- | ----- |
| `submitted` | `SUBMITTED` | — |
| `delivered`, `read` | `DELIVERED` | `deliveredAt` = `timestamp` (o ahora si no se puede leer) · `error = null` |
| `rejected`, `undeliverable` | `FAILED` | `error` = `title: detail` de Vonage (o el estado) |
| Otro | — | `ignored` |

Transiciones (`canTransition`), **nunca se retrocede**:

```text
QUEUED → SUBMITTED → DELIVERED
QUEUED/SUBMITTED → FAILED
FAILED → DELIVERED          (único caso que sale de FAILED)
DELIVERED: terminal
```

Resultado: `processed` (cambió) · `already_processed` (mismo estado o transición no permitida) · `ignored` (UUID o estado desconocidos). Logs con `notificationId`, `messageUuid`, estados; sin teléfonos.

## 4. Tests

| ID | Dónde | Qué |
| -- | ----- | --- |
| NS-R1, NS-R2 | `src/__tests__/notification-status.service.test.ts` | Repo en memoria: búsqueda y actualización parcial |
| NS-1…NS-11 | ídem | Mapeo, `deliveredAt`, error, idempotencia, no retroceder, FAILED→DELIVERED, desconocidos, mayúsculas |
| `canTransition` (10 casos) | ídem | Tabla de transiciones |
| INT-4, INT-5 | `tests/integration/notification.repo.int.test.ts` | `PrismaNotificationRepo` real |

## 5. Validación (26/11)

```text
$ pnpm check   → sin errores
$ pnpm test    → backend 13 files · 166 passed · frontend 6 files · 54 passed
```

Integración (INT-4, INT-5): pendiente de la CI / `pnpm --filter backend test:integration` en local.

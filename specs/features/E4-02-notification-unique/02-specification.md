# E4-02 · Idempotencia por destinataria — Especificación

## Cambios

| Pieza | Antes (B3) | Ahora (E4-02) |
|---|---|---|
| `NotificationRepo` | `existsForIncident(incidentId, template)` | `findRecipientIds(incidentId, template): string[]` |
| `create` | Sin control de duplicados en memoria; P2002 subía como error | Lanza `NotificationAlreadyExistsError` si choca con la unique por destinataria (memoria y Prisma) |
| `sendPostVisit` | Si había **alguna** fila `post_visit` → nada a nadie | Destinataria a destinataria: con fila → `ALREADY_SENT`; sin fila → SMS + fila |

## Flujo de `sendPostVisit`

1. Incidencia (404 → lanza, como antes).
2. Destinatarias: gestora (o `NO_MANAGER`) → inquilina.
3. `findRecipientIds` → las que ya tienen fila pasan a `skipped: ALREADY_SENT` (log `info`).
4. Si no queda ninguna → devuelve sin pedir el nombre de la técnica.
5. Para cada pendiente: SMS → `create` (`QUEUED` o `FAILED`).
   - `NotificationAlreadyExistsError` (otra llamada la guardó antes) → `skipped: ALREADY_SENT`, log `warn`, no cuenta en `sent`/`failed`.
   - Otro error → se propaga.

## Limitación conocida (Q1 = A)

Si dos llamadas llegan a la vez (p. ej. «Finalizar visita» y `sessionDestroyed`), las dos pueden pasar la consulta y enviar el SMS. La BD solo guarda **una fila por destinataria** y la segunda llamada lo devuelve como `ALREADY_SENT` con un `warn`, pero ese SMS de más ya ha salido. Evitarlo del todo exige reservar la fila antes de enviar (Q1 = B).

## Criterios de aceptación

- [ ] **CA-1** Una destinataria con fila no recibe SMS; la otra sí.
- [ ] **CA-2** Una fila de otra plantilla no cuenta.
- [ ] **CA-3** P2002 al guardar (`QUEUED` o `FAILED`) → `ALREADY_SENT`, no lanza, `warn`.
- [ ] **CA-4** Cualquier otro error al guardar se propaga.
- [ ] **CA-5** Todas con fila → no exige el nombre de la técnica.
- [ ] **CA-6** Postgres: la unique lanza `NotificationAlreadyExistsError`; un `providerMessageId` repetido no.
- [ ] **CA-7** Postgres: dos llamadas a la vez → una fila por destinataria y ningún error.

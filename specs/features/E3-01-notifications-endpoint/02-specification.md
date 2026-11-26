# E3-01 · Especificación

| Tipo | Archivo | Qué |
|---|---|---|
| `[NEW]` | `backend/src/routes/notifications.ts` | Ruta + `isParticipant()` + `toNotificationContract()` |
| `[MODIFY]` | `backend/src/repositories/notification.repo.ts` | `NotificationWithRecipient` + `findByIncidentId()` (memoria; recibe las destinatarias en el constructor) |
| `[MODIFY]` | `backend/src/repositories/prisma-notification.repo.ts` | `findByIncidentId()` con `include: { recipient: { select: id, name, role } }`, `orderBy createdAt asc` |
| `[MODIFY]` | `backend/src/app.ts` | Monta el router con `incidentRepo` y `notificationRepo` |

Orden: **400** cabeceras → **404** `Incident not found` → **403** no participa → **200** `{ notifications }`. Errores inesperados → 500 (handler global).

## Criterios de aceptación

- [ ] **CA-1** Forma exacta del schema `Notification`, fechas ISO o `null`, en orden de creación.
- [ ] **CA-2** Sin teléfono, email ni `providerMessageId`.
- [ ] **CA-3** 200 para inquilina, técnica y gestora de la incidencia.
- [ ] **CA-4** Lista vacía → `[]`.
- [ ] **CA-5** 400 sin cabeceras / rol inválido.
- [ ] **CA-6** 403 si no participa o el rol no casa con su id.
- [ ] **CA-7** 404 antes que 403.
- [ ] **CA-8** 500 si falla la BD.

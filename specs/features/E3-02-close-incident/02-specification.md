# E3-02 · Especificación

| Tipo | Archivo | Qué |
|---|---|---|
| `[NEW]` | `backend/src/services/close-incident.service.ts` | `CloseIncidentService.close()` → `not_found · forbidden · already_closed · report_not_ready · closed` |
| `[NEW]` | `backend/src/routes/close-incident.ts` | `POST /api/incidents/:id/close`, zod de cabeceras, body vacío |
| `[MODIFY]` | `backend/src/repositories/incident.repo.ts` | `closeIfReportReady()` (memoria) |
| `[MODIFY]` | `backend/src/repositories/prisma-incident.repo.ts` | `closeIfReportReady()` = `updateMany where { status: VIDEO_COMPLETED, visit: { is: { status: COMPLETED } } }` |
| `[MODIFY]` | `backend/src/app.ts` | Monta el router |

Orden: **400** → **404** → **403** → **200 already_closed** → **409 Report not ready** → `closeIfReportReady` → **200 closed**.
Si el UPDATE no afecta a ninguna fila (cambió entre medias): se relee → `already_closed` o `report_not_ready`.

## Criterios de aceptación

- [ ] **CA-1** Cierra y deja CLOSED.
- [ ] **CA-2** Ya cerrada → `already_closed` sin escribir.
- [ ] **CA-3** 409 si la visita no está COMPLETED o la incidencia no está VIDEO_COMPLETED.
- [ ] **CA-4** 403 inquilina, técnica, otra gestora, rol cambiado o sin gestora.
- [ ] **CA-5** 404.
- [ ] **CA-6** Carreras: cerrada por otra petición → `already_closed`; corregida por la técnica → 409.
- [ ] **CA-7** Tras cerrar, `visit-status` → 409.

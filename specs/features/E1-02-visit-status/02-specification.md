# E1-02 · Backend: cambiar estado de visita — Especificación

## Piezas

| Tipo | Archivo | Qué |
|---|---|---|
| `[NEW]` | `backend/src/services/visit-status.service.ts` | `VisitStatusService.change()` → resultado tipado (`not_found`, `forbidden`, `closed`, `no_video_session`, `visit_not_confirmed`, `unchanged`, `not_completed`, `completed`) |
| `[NEW]` | `backend/src/routes/visit-status.ts` | `POST /api/incidents/:id/visit-status`: zod de cabeceras y body, traduce el resultado a HTTP |
| `[MODIFY]` | `backend/src/repositories/incident.repo.ts` | `VisitOutcome` + `updateVisitOutcome()` (memoria) |
| `[MODIFY]` | `backend/src/repositories/prisma-incident.repo.ts` | `updateVisitOutcome()` con `$transaction` (visit + incident) |
| `[MODIFY]` | `backend/src/app.ts` | Monta el router con `incidentRepo` y `postVisitNotifier` |

Sin cambios en `openapi.yaml` ni en `schema.prisma` (vienen de E1-01).

## Orden de comprobaciones

1. **400** cabeceras (`X-User-Id`, `X-User-Role`) o body (`status` ∈ `COMPLETED | CANCELLED`).
2. **404** `Incident not found`.
3. **403** rol ≠ `TECHNICIAN` o `technicianId` ≠ `X-User-Id`.
4. **409** `Incident is closed`.
5. **409** `No video session`: sin visita, sin sesión o sesión `PENDING`.
6. **409** `Visit is not confirmed`: visita `PENDING`.
7. **200** `unchanged` si la visita ya está en ese estado.
8. **200** `not_completed` / `completed` (+ `notifications`).

| Petición | Visita | `completedAt` | Incidencia | SMS |
|---|---|---|---|---|
| `COMPLETED` | `COMPLETED` | ahora | `VIDEO_COMPLETED` | `sendPostVisit(id, '')` (E4-02: sin duplicados) |
| `CANCELLED` | `CANCELLED` | `null` | `VISIT_ASSIGNED` | no |

## Criterios de aceptación

- [ ] **CA-1** COMPLETED con sesión ACTIVE o ENDED → estados + SMS + resumen.
- [ ] **CA-2** CANCELLED → estados, sin SMS.
- [ ] **CA-3** Corrección en los dos sentidos; volver a COMPLETED no reenvía SMS.
- [ ] **CA-4** Mismo estado → `unchanged`, sin escribir ni enviar.
- [ ] **CA-5** SMS fallido → visita COMPLETED y `failed` en el resumen; `sendPostVisit` lanza → `completed` sin resumen.
- [ ] **CA-6** 403 rol u otra técnica.
- [ ] **CA-7** 404.
- [ ] **CA-8** 409 CLOSED (también al corregir).
- [ ] **CA-9** 409 sin sesión / sesión PENDING / visita PENDING.

## Riesgo para E1-04 / E0-02

Tras un `CANCELLED`, la incidencia vuelve a `VISIT_ASSIGNED` con la sesión aún `ACTIVE`. Cuando llegue `sessionDestroyed`, el webhook de `main` (A4) completaría la incidencia y mandaría los SMS. La E0-02 (#79) ya solo envía si la visita sigue `CONFIRMED`; la E1-04 tiene que respetar también la visita `CANCELLED`.

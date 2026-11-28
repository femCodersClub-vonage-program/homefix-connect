# E1-04 · Especificación

`backend/src/routes/video-events.ts` (sobre E0-02):

1. 401 firma · 400 payload · otro evento → `ignored` · `serverRotation` → `ignored` · sesión desconocida → `ignored` · sesión ENDED → `already_processed` (sin cambios).
2. `visitStillOpen` = incidencia `VISIT_ASSIGNED` + visita `CONFIRMED` + sesión `ACTIVE`.
3. Si está abierta: `incidentRepo.updateVisitOutcome(id, { COMPLETED, now, VIDEO_COMPLETED })` → `sendPostVisit(id, '')` (errores capturados, como A4 Q3).
4. **Siempre**: `VideoSession` → `ENDED` + `endedAt`.
5. Respuesta: abierta → `processed`; si no → `already_processed`.

Si el paso 3 lanza (BD) → 500, la sesión sigue ACTIVE y el reintento repite el flujo.

## Criterios de aceptación

- [ ] **CA-1** Fallback: visita COMPLETED + `completedAt`, incidencia VIDEO_COMPLETED, SMS una vez.
- [ ] **CA-2** Fallo al guardar la visita → 500, sin SMS, sesión ACTIVE; el reintento completa.
- [ ] **CA-3** Técnica marcó No completada (E1-02) → el webhook solo cierra la sesión, sin SMS.
- [ ] **CA-4** Técnica marcó Completada (E1-02) → el webhook solo cierra la sesión; 2 SMS en total.
- [ ] **CA-5** Lo de E0-02 sigue igual (sus tests).

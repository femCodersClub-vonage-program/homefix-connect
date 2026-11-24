## Refinamiento C5 (AGENTS.md §5.1 / §8.1)

Rama `feat/C5-finish-toast`, desde `main` (ya contiene C1–C4).

### Qué hace / cómo lo hace

- **Qué:** al pasar una incidencia abierta a `VIDEO_COMPLETED`, muestra durante 5 s el aviso `"Visita finalizada. Notificaciones enviadas a gestora e inquilina."` y deja el botón deshabilitado con "Visita realizada".
- **Cómo:** `useIncident` sondea cada 5 s hasta que el estado es `VIDEO_COMPLETED`; un hook `useFinishToast` detecta la transición y un componente propio `FinishToast` renderiza el aviso con `role="status"` y `aria-live="polite"`. Sin librerías nuevas.

### Datos mínimos

- Solo `incident.status` (`IncidentStatus` generado en `src/api/generated/openapi.d.ts`).
- No se añaden campos ni payloads; el aviso es texto fijo.

### Estados / enums

- Se usan los existentes: `REPORTED`, `VISIT_ASSIGNED`, `VIDEO_COMPLETED`, `CLOSED`.
- Solo `VIDEO_COMPLETED` dispara el toast. `CLOSED` no.

### Payload / contrato

- Sin cambios en `backend/openapi.yaml` ni `backend/prisma/schema.prisma`.
- Sin endpoints nuevos. `GET /api/incidents/:id` ya devuelve `status`.

### Errores

- No se introducen códigos nuevos (`400/403/404/409/500` siguen igual).
- Si falla un refetch, TanStack Query conserva el último dato válido; el toast no sustituye la UI de error.

### Decisiones acordadas

| # | Decisión |
|---|---|
| U-01 | Componente propio; sin `react-hot-toast` ni dependencias nuevas. |
| U-02 | Auto-dismiss a los 5 s, sin botón de cierre. |
| U-03 | Polling de 5 s en `useIncident` mientras no esté `VIDEO_COMPLETED`; se detiene al completarse. |
| U-04 | Toast solo en la transición; si se abre ya completada, no aparece. |

### Dependencias

- Hard: C1 (#17), C2 (#18) — ambas cerradas.
- Soft: A4/B3 (webhook `session.end`) — se mockea en tests.

### Rama sugerida

`feat/C5-finish-toast`

> Publicado como [comentario en el issue #21](https://github.com/femCodersClub-vonage-program/homefix-connect/issues/21#issuecomment-7133212296).

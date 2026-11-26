# E0-05 · Contrato y DI de `GET /api/incidents/:id` — Especificación

> Issue: #64 · Rama: `fix/E0-05-incidents-contract` · Requisitos: `01-requirements.md`

## 1. Comportamiento

`createIncidentsRouter({ incidentRepo })` en `src/routes/incidents.ts`, montado en `app.ts` con el mismo `incidentRepo` que el resto de rutas.

| # | Condición | Respuesta |
| - | --------- | --------- |
| 1 | Faltan `X-User-Id` / `X-User-Role`, `X-User-Id` vacío o rol fuera de `Role` | 401 `{ error }` (no consulta el repo) |
| 2 | La incidencia no existe | 404 `{ error: 'Incident not found' }` |
| 3 | El usuario no es `tenantId` (TENANT), `technicianId` (TECHNICIAN) ni `managerId` (MANAGER) de la incidencia | 403 `{ error }` |
| 4 | Resto | 200 `toIncidentContract(incident)` |
| — | Error inesperado | 500 (errorHandler) |

`toIncidentContract`: `id`, `title`, `description`, `status`, `technician { id, name } | null`, `visit { id, status, scheduledAt, videoSession { id, status } | null } | null`.

## 2. Contrato

`openapi.yaml`: `X-User-Id` y `X-User-Role` pasan a `required: true`; respuestas nuevas **401**, **403** y **500**. Tipos del frontend regenerados.

## 3. Tests

| ID | Dónde | Qué |
| -- | ----- | --- |
| IC-1…IC-9 | `tests/contract/incidents.contract.test.ts` | 200 con la forma exacta para las 3 roles · repo inyectado · sin datos personales · nulls · 401 (sin cabeceras, parciales, vacías, rol inválido) · 404 · 403 (otro usuario, rol cruzado) · sin técnica asignada |
| HC-1, HC-2 | `tests/contract/health.contract.test.ts` | `{ status, timestamp }` exacto con ISO 8601 · sin cabeceras |
| INT-I1…INT-I3 | `tests/integration/incidents.int.test.ts` | Con `PrismaIncidentRepo` real: forma del contrato sin teléfonos · gestora 200 · 403 y 401 |

`src/__tests__/app.test.ts` deja de mockear `prisma.incident.findUnique` (la ruta ya no usa Prisma directo); se queda con health y 404 genérico.

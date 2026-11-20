# #38 · Bug: GET /incidents/:id expone datos fuera del contrato — Requisitos

Issue: https://github.com/femCodersClub-vonage-program/homefix-connect/issues/38

## 1. Requisitos clasificados

### Explícitos (issue #38)

- `GET /api/incidents/:id` responde solo con los campos del schema `Incident` de `openapi.yaml`.
- No expone `phone`, `email`, `tenant`, `manager`, `createdAt` ni `updatedAt`.
- Mantiene `technician { id, name }` y `visit { id, status, scheduledAt, videoSession { id, status } }`.
- Mantiene el 404 actual (ver Q2).
- Test de la ruta que verifica la forma de la respuesta.
- Sin cambios en `openapi.yaml` ni en los enums (`IncidentStatus`, `VisitStatus`, `VideoSessionStatus`).

### Derivados (backend/openapi.yaml, schema Incident)

- La respuesta solo debe incluir: `id`, `title`, `description`, `status`, `technician`, `visit`.
- `description` puede ser texto o `null`.
- `technician` debe ser `null` o `{ id, name }`.
- `visit` debe ser `null` o `{ id, status, scheduledAt, videoSession }`.
- `visit.videoSession` debe ser `null` o `{ id, status }`.

## 2. Hallazgos al revisar el código

Ruta: `backend/src/routes/incidents.ts`. Hace `prisma.incident.findUnique` con `include` de `tenant`, `technician`, `manager` y `visit.videoSession` (todos enteros) y devuelve el resultado con `res.json(incident)` sin filtrar.

| Campo                                   | Ahora                                                                             | Contrato                                             |
| --------------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `id`, `title`, `description`, `status`  | Salen                                                                             | Sale                                                 |
| `tenantId`, `technicianId`, `managerId` | Salen                                                                             | No debe salir                                        |
| `createdAt`, `updatedAt`                | Salen                                                                             | No debe salir                                        |
| `tenant`                                | Sale el usuario entero (con `phone`, `email`, `role`, fechas)                     | No debe salir                                        |
| `manager`                               | Sale el usuario entero (con `phone`, `email`, `role`, fechas)                     | No debe salir                                        |
| `technician`                            | Sale el usuario entero (con `phone`, `email`, `role`, fechas)                     | `null` o `{ id, name }`                              |
| `visit`                                 | Sale entero, también `incidentId`, `createdAt`, `updatedAt`                       | `null` o `{ id, status, scheduledAt, videoSession }` |
| `visit.videoSession`                    | Sale entera, también `visitId`, `vonageSessionId`, `startedAt`, `endedAt`, fechas | `null` o `{ id, status }`                            |
| 404                                     | `{ error: 'Incident not found', id }`                                             | `{ error }` (ver Q2)                                 |

- **Hallazgo extra:** también se expone `vonageSessionId`, que el issue no menciona.
- **Tests actuales:** `backend/src/__tests__/app.test.ts` tiene 2 tests de la ruta (200 y 404). Mockean `prisma.incident.findUnique` y no comprueban qué campos salen.
- **Frontend:** C2 (`frontend/src/api/incidents.ts`, `useIncident.ts`) no usa ninguno de los campos que se quitan.
- **Comentario desactualizado:** en `openapi.yaml` (encima del schema `Incident`) dice que `visit.videoSession` se omite, pero el schema sí lo incluye como `{ id, status }`.

## 3. Desconocidos (preguntas para el issue)

**Q1 · Cómo filtrar:**

- Opción A (la del issue): `select` explícito de Prisma en la ruta. El test tendría que mockear `prisma.incident.findUnique`, y un mock devuelve lo que se le da, así que no prueba el filtrado real.
- Opción B: la ruta usa `incidentRepo.findById` (ya inyectado en `app.ts`) + una función que convierte el resultado al formato del contrato. Se testea con `InMemoryIncidentRepo` + Supertest, como `video-tokens.test.ts` (A3), y el test sí comprueba que no salen campos de más.
- Propongo la B. ¿Os parece bien o preferís la A?

**Q2 · Respuesta 404:** el issue dice "mantener el 404 actual" y también "404 `{ error }`". Pero el 404 actual devuelve `{ error, id }` y el schema `Error` solo define `{ error }`. ¿Quitamos el `id` o lo dejamos?

**Q3 · Comentario de `openapi.yaml`:** ¿corrijo el comentario desactualizado de `visit.videoSession` en este PR o lo dejamos (el issue dice que no se toca `openapi.yaml`)?

## 4. Decisiones de Clarificación Acordadas

- Sin respuesta del equipo a 19/11, se sigue lo que pide el issue:
  - Q1: opción A (`select` de Prisma en la ruta).
  - Q2: se quita el id del 404 para cumplir el schema Error (review de Miranda, 19/11).
  - Q3: no se toca `openapi.yaml` en este PR.

## 5. Fuera de alcance

- Cambiar el contrato `openapi.yaml` (salvo lo que se decida en Q3).
- Otras rutas del backend.
- Cambios en el frontend.

# #38 · GET /api/incidents/:id alineado con el contrato — Especificación

Issue: https://github.com/femCodersClub-vonage-program/homefix-connect/issues/38
Requisitos: `01-requirements.md`

## 1. Resumen y contexto

Hoy `GET /api/incidents/:id` devuelve la incidencia completa de la base de datos, con todas sus relaciones: los datos personales del inquilino, el técnico y el gestor (`phone`, `email`), campos internos (`tenantId`, fechas) y el `vonageSessionId` de la videollamada. Nada de eso está en el contrato `openapi.yaml` y la pantalla `IncidentDetail` (C2) no lo necesita.

El objetivo es que la ruta devuelva solo los campos del schema `Incident`, sin cambiar el contrato ni el frontend.

## 2. Alcance

**Dentro:**

- Arreglar la respuesta de `GET /api/incidents/:id` para que cumpla el schema `Incident`.
- Adaptar el test de la ruta para que compruebe la forma de la respuesta.

**Fuera:**

- Cambiar el contrato `openapi.yaml` (salvo lo que se decida en Q3).
- Otras rutas del backend.
- Cambios en el frontend.

## 3. Requisitos funcionales

- **RF-1:** La ruta devuelve solo los campos `id`, `title`, `description`, `status`, `technician`, `visit`.
- **RF-2:** `technician` se devuelve como `null` o `{ id, name }`.
- **RF-3:** `visit` se devuelve como `null` o `{ id, status, scheduledAt, videoSession }`.
- **RF-4:** `visit.videoSession` se devuelve como `null` o `{ id, status }`.
- **RF-5:** No se devuelven nunca: `tenant`, `manager`, `tenantId`, `technicianId`, `managerId`, `createdAt`, `updatedAt`, `phone`, `email`, `vonageSessionId`.
- **RF-6:** Si la incidencia no existe → 404 con `{ error: 'Incident not found' }` (Q2: se quita id para cumplir el schema Error).

## 4. Contrato de entrada

- Método y ruta: `GET /api/incidents/:id`
- Parámetro: `id` (string, en la URL)

## 5. Contrato de salida (200)

Ejemplo de respuesta correcta:

```json
{
  "id": "inc_demo",
  "title": "Fuga de agua en el baño",
  "description": "El grifo del lavabo pierde agua desde ayer.",
  "status": "VISIT_ASSIGNED",
  "technician": { "id": "usr_technician_demo", "name": "Técnica Demo" },
  "visit": {
    "id": "visit_demo",
    "status": "CONFIRMED",
    "scheduledAt": "2026-11-20T10:00:00.000Z",
    "videoSession": { "id": "vs_demo", "status": "PENDING" }
  }
}
```

> Datos del seed (`backend/src/db/seed.ts`). `scheduledAt` es un ejemplo: en el seed se calcula como "mañana".

## 6. Manejo de errores

| Caso                    | Código | Cuerpo                                                                             |
| ----------------------- | ------ | ---------------------------------------------------------------------------------- |
| La incidencia no existe | 404    | `{ "error": "Incident not found" }` (Q2: se quita id para cumplir el schema Error) |

## 7. Casos límite

- Incidencia sin técnico → `technician` = `null`
- Incidencia sin visita → `visit` = `null`
- Visita sin videosesión → `visit.videoSession` = `null`
- `description` vacía en la BD (`null`) → `description` = `null`
- Las relaciones que sí existen tampoco llevan campos de más (p. ej. `technician` nunca incluye `phone`).

## 8. Criterios de aceptación

- **CA-1:** Dado una incidencia con técnico, visita y videosesión, cuando se pide `GET /api/incidents/:id`, entonces responde 200 solo con `id`, `title`, `description`, `status`, `technician { id, name }` y `visit { id, status, scheduledAt, videoSession { id, status } }`.
- **CA-2:** Dado una incidencia cualquiera, cuando se pide, entonces la respuesta no contiene `tenant`, `manager`, `phone`, `email`, `tenantId`, `technicianId`, `managerId`, `createdAt`, `updatedAt` ni `vonageSessionId`.
- **CA-3:** Dado una incidencia sin técnico ni visita, cuando se pide, entonces `technician` y `visit` son `null`.
- **CA-4:** Dado un `id` que no existe, cuando se pide, entonces responde 404 con `{ error: 'Incident not found'}`.
- **CA-5:** Hay test de la ruta que comprueba CA-1 a CA-4.

## 9. Diseño técnico

Opción A, la que propone el issue (Q1).

- En `backend/src/routes/incidents.ts`, cambiar el `include` de `prisma.incident.findUnique` por un `select` explícito que pida solo los campos del contrato:
  - `id`, `title`, `description`, `status`
  - `technician: { select: { id, name } }`
  - `visit: { select: { id, status, scheduledAt, videoSession: { select: { id, status } } } }`
- Las relaciones opcionales que no existen llegan de Prisma como `null`, que es lo que pide el contrato.
- El 404 no cambia.
- No se toca nada más (ni `app.ts`, ni repos, ni `openapi.yaml`).

## 10. Estrategia de pruebas

- **Dónde:** `backend/src/__tests__/app.test.ts`, bloque `GET /api/incidents/:id` (se amplía).
- **Cómo:** Supertest contra `createApp` con `prisma.incident.findUnique` mockeado.
- **Qué comprueban:**
  - El `select` que se pasa a Prisma es exactamente el del contrato (`toHaveBeenCalledWith`) y no hay `include`. Así se prueba el filtrado aunque Prisma esté mockeado.
  - CA-1: la respuesta 200 tiene exactamente las claves del contrato (también dentro de `technician`, `visit` y `videoSession`).
  - CA-2: no aparece ninguno de los campos prohibidos.
  - CA-3: `technician` y `visit` son `null` cuando no existen.
  - CA-4: 404 con `{ error: 'Incident not found'}`.
- Antes del PR: `pnpm check` y `pnpm test` en verde.

## 11. Decisiones (Q1–Q3)

Se sigue lo que pide el issue #38 mientras no haya otra respuesta del equipo:

- **Q1 · Cómo filtrar:** ✅ opción A, `select` explícito de Prisma en la ruta (lo que indica el issue).
- **Q2 · 404:** ✅ se quita id del 404 para cumplir el schema Error de openapi.yaml (review de Miranda, 19/11).
- **Q3 · Comentario de `openapi.yaml`:** ✅ no se toca en este PR (el issue dice "sin cambios en `openapi.yaml`"); se puede corregir aparte.

## 12. Dependencias

- **Hard:** T1 (#2, cerrado, contrato OpenAPI) y C2 (#33, mergeado, consumidor de la ruta).
- **Soft:** ninguna. No depende del #40 (A2) ni de la B1.

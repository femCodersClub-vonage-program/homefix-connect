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
- **RF-6:** Si la incidencia no existe → 404 (cuerpo ⏳ Q2).

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

| Caso                    | Código | Cuerpo                                                                  |
| ----------------------- | ------ | ----------------------------------------------------------------------- |
| La incidencia no existe | 404    | `{ "error": "Incident not found" }` (⏳ Q2: ¿se mantiene también `id`?) |

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
- **CA-4:** Dado un `id` que no existe, cuando se pide, entonces responde 404 con `{ error: 'Incident not found' }` (⏳ Q2).
- **CA-5:** Hay test de la ruta que comprueba CA-1 a CA-4.

## 9. Diseño técnico

⏳ Depende de Q1.

- **Opción A:** en `backend/src/routes/incidents.ts`, cambiar el `include` por un `select` de Prisma que pida solo los campos del contrato. No se toca nada más.
- **Opción B (propuesta):**
  - Convertir `incidentsRouter` en `createIncidentsRouter({ incidentRepo })`, igual que `createVideoTokensRouter` (A3), y pasarle el `incidentRepo` que ya existe en `createApp` (`backend/src/app.ts`).
  - La ruta usa `incidentRepo.findById(id)` en lugar de `prisma` directamente.
  - Nueva función `toIncidentDto(incident)` que convierte `IncidentWithRelations` al formato del schema `Incident` (solo los campos del contrato).

## 10. Estrategia de pruebas

- **Dónde:** `backend/src/__tests__/` (con la opción B, un test nuevo de la ruta siguiendo el patrón de `video-tokens.test.ts`; se adaptan los 2 tests actuales de `app.test.ts`).
- **Cómo:** Supertest contra `createApp` con `InMemoryIncidentRepo` y datos tipo seed (opción B) o con `prisma.incident.findUnique` mockeado (opción A).
- **Qué comprueban:**
  - CA-1: la respuesta 200 tiene exactamente las claves del contrato (`Object.keys`), no solo `toMatchObject`.
  - CA-2: no aparece ninguno de los campos prohibidos.
  - CA-3: `technician` y `visit` son `null` cuando no existen.
  - CA-4: 404 con `{ error: 'Incident not found' }`.
- Antes del PR: `pnpm check` y `pnpm test` en verde.

## 11. Decisiones (Q1–Q3)

- **Q1 · Cómo filtrar:** ⏳ propuesta: opción B.
- **Q2 · 404:** ⏳ propuesta: dejar solo `{ error }` como dice el schema `Error`.
- **Q3 · Comentario de `openapi.yaml`:** ⏳

## 12. Dependencias

- **Hard:** T1 (#2, cerrado, contrato OpenAPI) y C2 (#33, mergeado, consumidor de la ruta).
- **Soft:** ninguna. No depende del #40 (A2) ni de la B1.

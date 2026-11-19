# #38 · GET /api/incidents/:id alineado con el contrato — Plan de implementación

Spec: `02-specification.md`. Plan escrito asumiendo **Q1 = opción B** (⏳ pendiente de confirmar; si se elige A, ver apartado 4).

## 1. Ficheros afectados

- `[MODIFY] backend/src/routes/incidents.ts`: `incidentsRouter` pasa a ser `createIncidentsRouter({ incidentRepo })`; usa `incidentRepo.findById(id)` y devuelve `toIncidentDto(incident)`.
- `[NEW] backend/src/lib/incident-dto.ts`: función `toIncidentDto(incident: IncidentWithRelations)` que devuelve solo los campos del schema `Incident`.
- `[MODIFY] backend/src/app.ts`: cambiar `app.use('/api', incidentsRouter)` por `createIncidentsRouter({ incidentRepo })`.
- `[NEW] backend/src/__tests__/incidents.test.ts`: tests de la ruta (CA-1 a CA-4).
- `[MODIFY] backend/src/__tests__/app.test.ts`: quitar los 2 tests de `GET /api/incidents/:id` (pasan a `incidents.test.ts`) y el mock de `prisma.incident.findUnique` si ya no se usa.
- No se toca: `openapi.yaml` (salvo Q3), `frontend/`, `incident.repo.ts`.

## 2. Estrategia de pruebas (TDD)

- Patrón: `video-tokens.test.ts` (A3). `vi.mock("../db/client.js", () => ({ prisma: {} }))`, `createApp({ incidentRepo: new InMemoryIncidentRepo(...) })` y Supertest.
- Fixtures tipo seed: una incidencia completa (`inc_demo` con técnico, visita y videosesión) y una sin técnico ni visita.
- Tests (primero en rojo):
  1. CA-1: 200 y `Object.keys(res.body)` es exactamente `[id, title, description, status, technician, visit]`; `technician` solo `{ id, name }`; `visit` solo `{ id, status, scheduledAt, videoSession }`; `videoSession` solo `{ id, status }`.
  2. CA-2: el JSON de la respuesta no contiene `phone`, `email`, `tenant`, `manager`, `tenantId`, `technicianId`, `managerId`, `createdAt`, `updatedAt` ni `vonageSessionId`.
  3. CA-3: incidencia sin técnico ni visita → `technician: null`, `visit: null`.
  4. CA-4: id inexistente → 404 `{ error: 'Incident not found' }` (⏳ Q2).

## 3. Orden de ejecución

1. Esperar confirmación de Q1–Q3 y aprobación de spec + plan.
2. Escribir `incidents.test.ts` con los 4 tests → ejecutar → en rojo.
3. Crear `toIncidentDto` en `backend/src/lib/incident-dto.ts`.
4. Convertir la ruta en `createIncidentsRouter({ incidentRepo })` y usar el mapper.
5. Conectar el router en `app.ts`.
6. Ejecutar tests → en verde.
7. Limpiar `app.test.ts` (quitar los tests movidos).
8. `pnpm check` + `pnpm test` en verde.
9. Escribir `04-validation.md` y abrir el PR con `Closes #38` (review: Miranda).

## 4. Riesgos y mitigaciones

- **Se elige la opción A:** no se crean mapper ni router factory; se cambia `include` por `select` en la ruta y los tests van en `app.test.ts` mockeando Prisma. Se actualiza este plan.
- **`scheduledAt` es `Date`:** al pasar por `res.json` sale como string ISO; el test compara con string.
- **El `PrismaIncidentRepo` hace `include` de técnico y visita, pero no de `tenant`/`manager`:** no afecta, porque el mapper solo devuelve lo del contrato.
- **Conflicto con el #40 (A2) en `app.ts`:** si se mergea antes, hacer rebase sobre `main` antes del PR.

## 5. Pendiente

- ⏳ Q1 (opción A o B), Q2 (cuerpo del 404), Q3 (comentario de `openapi.yaml`).
- ⏳ Aprobación de spec y plan.

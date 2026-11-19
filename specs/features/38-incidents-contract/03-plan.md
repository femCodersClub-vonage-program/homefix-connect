# #38 · GET /api/incidents/:id alineado con el contrato — Plan de implementación

Spec: `02-specification.md`. Opción A (Q1), la que pide el issue.

## 1. Ficheros afectados

- `[MODIFY] backend/src/routes/incidents.ts`: cambiar el `include` por un `select` explícito con solo los campos del contrato; actualizar el comentario de la ruta.
- `[MODIFY] backend/src/__tests__/app.test.ts`: ampliar el bloque `GET /api/incidents/:id` con los tests de CA-1 a CA-4 y la comprobación del `select`.
- No se toca: `app.ts`, repositorios, `openapi.yaml`, `frontend/`.

## 2. Estrategia de pruebas (TDD)

- Patrón: el `app.test.ts` actual (`vi.mock('../db/client.js')` con `prisma.incident.findUnique` mockeado + Supertest).
- Tests (primero en rojo):
  1. La ruta llama a `findUnique` con `where: { id }` y el `select` del contrato, sin `include`.
  2. CA-1: 200 y las claves de la respuesta son exactamente las del contrato, también dentro de `technician`, `visit` y `videoSession`.
  3. CA-2: la respuesta no contiene `phone`, `email`, `tenant`, `manager`, `tenantId`, `technicianId`, `managerId`, `createdAt`, `updatedAt` ni `vonageSessionId`.
  4. CA-3: incidencia sin técnico ni visita → `technician: null`, `visit: null`.
  5. CA-4: id inexistente → 404 `{ error: 'Incident not found', id }`.
- Limitación conocida de la opción A: con Prisma mockeado, el test 1 es el que demuestra el filtrado; los demás comprueban la forma de la respuesta.

## 3. Orden de ejecución

1. Escribir los tests en `app.test.ts` → ejecutar → en rojo.
2. Cambiar `include` por `select` en `incidents.ts`.
3. Ejecutar tests → en verde.
4. `pnpm check` + `pnpm test` en verde.
5. Escribir `04-validation.md` y abrir el PR con `Closes #38` (review: Miranda).

## 4. Riesgos y mitigaciones

- **El equipo prefiere la opción B** (repo + mapper): se cambia en el mismo PR; el comportamiento y los tests de forma se mantienen.
- **`scheduledAt` es `Date`:** al pasar por `res.json` sale como string ISO; el test compara con string.
- **Conflicto con el #40 (A2):** no toca los mismos ficheros; si `main` cambia, rebase antes del PR.

## 5. Pendiente

- Confirmación del equipo de Q1–Q3 en la review del PR.

# 01 — Requirements · C2 · Pantalla IncidentDetail

> **Issue:** [#18](https://github.com/femCodersClub-vonage-program/homefix-connect/issues/18)
> **Rama sugerida:** `feat/C2-incident-detail` · **Size:** S
> **Fuente de alcance:** `docs/MVP_DEFINITION.md` · `docs/TASKS.md` §7 · `frontend/AGENTS.md`
> **Estado:** análisis inicial (fase SDD-02). Pendiente de clarificación (SDD-03).

---

## 1. Resumen del Problema

El MVP arranca con una incidencia ya creada y una visita asignada. Sin una
pantalla que muestre esa incidencia, la inquilina y la técnica no tienen un punto
de entrada para iniciar la videollamada.

**Valor de negocio:** dar a la persona usuaria la información mínima de la
incidencia y un acceso controlado ("Entrar a la videollamada" solo cuando el
estado lo permite), que es el primer paso observable del flujo del MVP.

**Consumidor final:** inquilina (`TENANT`) y técnica (`TECHNICIAN`). La gestora no
interactúa con esta pantalla en el MVP.

---

## 2. Casos de Uso Afectados

Referencia: `docs/MVP_DEFINITION.md`.

| Escenario | Relación con C2 |
|---|---|
| **1 — Inquilina entra a la videollamada** | C2 muestra la incidencia y el botón que dispara la entrada. |
| **2 — Técnica entra a la videollamada** | La misma pantalla sirve a ambos roles mediante el selector. |
| **4 — Frontend notifica fin de visita** | C2 debe mostrar el botón deshabilitado ("Visita realizada") si la incidencia está `VIDEO_COMPLETED`. El toast en sí pertenece a C5. |

**Precondición del MVP:** incidencia `VISIT_ASSIGNED`, visita `CONFIRMED`,
sesión de vídeo `PENDING` (ver `backend/src/db/seed.ts`).

---

## 3. Comportamiento Actual vs Esperado

### Hoy (código actual)

- `frontend/src/App.tsx` es una pantalla *smoke* que solo consulta `GET /api/health`.
- No existe pantalla de incidencia, ni selector de rol, ni botón de entrada.
- `frontend/src/api/http.ts` solo hace `GET` con `Accept: application/json`; no
  permite cabeceras `X-User-Id` / `X-User-Role`.
- `backend/src/routes/incidents.ts` ya expone `GET /api/incidents/:id`, pero
  devuelve el objeto Prisma **completo** (superset del contrato que fijará T1).
- No hay router ni manejo de `/incidents/:id` en la URL.

### Esperado (tras C2)

- Pantalla `IncidentDetail` que:
  - muestra **título, descripción, estado, fecha/hora de la visita y nombre de la técnica**;
  - muestra un **selector de rol** (inquilina / técnica);
  - muestra el botón **"Entrar a la videollamada"**:
    - **habilitado** si `incident.status === VISIT_ASSIGNED` y `visit.status === CONFIRMED`;
    - **deshabilitado** con texto **"Visita realizada"** si `incident.status === VIDEO_COMPLETED`;
  - cubre estados de **loading**, **error** y **404** con TanStack Query.
- Las peticiones llevan `X-User-Id` y `X-User-Role` según el rol seleccionado.
- Funciona con **mock data** mientras no exista el cliente generado (C1).

---

## 4. Fuera de Alcance (Out of Scope)

- ❌ Implementar la videollamada o integrar el SDK de Vonage (C3/C4).
- ❌ Mostrar el toast "Visita finalizada" (C5). C2 solo deja el botón en estado
  "Visita realizada".
- ❌ Cliente API generado desde OpenAPI (C1) y tipos definitivos (T1).
- ❌ Añadir `react-router` u otra dependencia de routing (ver decisión en §7).
- ❌ Autenticación/login real; se usan IDs simulados del seed.
- ❌ Crear/editar incidencias, proponer o confirmar visitas.
- ❌ Dashboard de la gestora o listado de incidencias.
- ❌ Cambios de backend o de contrato. Si la forma devuelta no encaja, se anota
  como riesgo y se reconcilia con T1, no se modifica la API en este PR.
- ❌ Framework de UI, CSS-in-JS o sistema de diseño.

---

## 5. Dependencias

### Hard

- **Ninguna estrictamente bloqueante.** El propio issue autoriza *mock data* si la
  API todavía no existe.

### Soft (mockeable / sustituible)

| Dependencia | Uso | Estrategia provisional |
|---|---|---|
| **C1** · cliente generado | Tipos y cliente definitivos | `getJson<T>()` de `src/api/http.ts` + tipo local marcado como provisional |
| **T1** · contrato OpenAPI | Forma final de `GET /api/incidents/:id` | Asumir el subconjunto descrito en el issue; reconciliar al cerrar T1 |
| **Backend + seed** | Datos reales en demo local | Fixture mock para tests; API real para demo manual |
| **X1** | Interfaces de backend | No aplica al frontend (no se consume desde la UI) |

### Datos mínimos necesarios

- `incident.id`, `title`, `description`, `status`
- `visit.status`, `visit.scheduledAt`
- `technician.name`
- IDs de demostración: `inc_demo`, `usr_tenant_demo`, `usr_technician_demo`
  (`backend/src/db/seed.ts`)

---

## 6. Trazabilidad de código

| Archivo | Qué aporta / por qué se toca |
|---|---|
| `frontend/src/App.tsx:10` | Pantalla actual; pasa a renderizar/ envolver `IncidentDetail`. |
| `frontend/src/main.tsx:8` | `QueryClientProvider` ya disponible para `useQuery`. |
| `frontend/src/api/http.ts:7` | `getJson<T>()`; necesita soporte de cabeceras `X-User-*`. |
| `frontend/src/App.test.tsx:1` | Patrón de test con `QueryClientProvider` y `vi.stubGlobal('fetch')`. |
| `frontend/src/index.css:31` | Estilos `.card` reutilizables para la pantalla. |
| `backend/src/routes/incidents.ts:12` | Forma actual de la respuesta (superset del contrato). |
| `backend/prisma/schema.prisma` | Enums `IncidentStatus` (`VISIT_ASSIGNED`, `VIDEO_COMPLETED`…) y `VisitStatus` (`CONFIRMED`…). |
| `backend/src/db/seed.ts` | IDs fijos de demo para el selector de rol y los tests. |
| `docs/MVP_DEFINITION.md` | Escenarios 1, 2 y 4. |
| `docs/TASKS.md` §7 | Fila de C2 y sus dependencias. |
| `frontend/AGENTS.md` §3-§7 | Capas, TanStack Query, tests y estilo. |

---

## 7. Vacíos de Información (entrada para SDD-03)

Preguntas a resolver **antes** de especificar/planificar:

1. **Router:** ¿pantalla única leyendo el `incidentId` de la URL (query/hash) o se
   añade `react-router`? *(Añadir dependencia exige justificación.)*
2. **Fuente de datos:** ¿se llama a la API real y se usa el mock solo como fallback
   en tests, o el mock es el modo por defecto hasta C1?
3. **Cabeceras de rol:** ¿se extiende `getJson` con un parámetro de cabeceras o se
   crea un helper específico `getIncident(id, role)`?
4. **Persistencia del rol:** ¿solo estado en memoria, o se refleja en la URL?
5. **Mapeo de estados:** ¿qué muestra el botón para `REPORTED`, `CLOSED`,
   `CANCELLED` o si `visit`/`technician` son `null`?
6. **Formato de fecha:** ¿locale `es-ES`, fecha + hora, o ISO crudo?
7. **Error/404:** ¿mensaje único de error o distinguir 404 de fallo de red?
8. **Fixture mock:** ¿dónde vive (`frontend/src/test/fixtures/`?) y replica qué
   subconjunto?
9. **Tests:** ¿qué casos mínimos? (render de datos, botón habilitado, botón
   "Visita realizada", loading, error/404, cambio de rol envía cabeceras).

---

## 8. Riesgos

- **Forma de la respuesta divergente:** el backend devuelve hoy un objeto Prisma
  completo; T1 definirá un contrato mínimo. C2 debe leer solo los campos que
  necesita para no acoplarse al superset.
- **Acoplamiento a mock:** si el fixture difiere del contrato final, habrá retrabajo
  al integrar C1. Mitigación: usar un tipo local `Incident` alineado con el issue.
- **Scope creep hacia C5:** el toast NO entra aquí; solo el estado del botón.

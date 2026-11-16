# 02 — Specification · C2 · Pantalla IncidentDetail

> **Issue:** [#18](https://github.com/femCodersClub-vonage-program/homefix-connect/issues/18)
> **Rama:** `feat/C2-incident-detail` · **Size:** S
> **Base:** `01-requirements.md` (mismo directorio) · `docs/MVP_DEFINITION.md` escenarios 1, 2 y 4
> **Estado:** aprobada el 2026-11-16. Plan técnico en `03-plan.md`.

---

## 1. Objetivo

Mostrar la incidencia y su visita, permitir elegir el rol (inquilina/técnica) y
exponer el botón "Entrar a la videollamada" con el estado correcto según la
incidencia. Es el punto de entrada del flujo del MVP; la videollamada en sí es
C3/C4.

---

## 2. Alcance

### Dentro

- Pantalla `IncidentDetail` para un `incidentId`.
- Lectura de `GET /api/incidents/:id` con TanStack Query.
- Selector de rol (inquilina / técnica) en memoria.
- Cabeceras `X-User-Id` y `X-User-Role` en las peticiones.
- Estado del botón según `incident.status` + `visit.status`.
- Estados de carga, 404 y error genérico.
- Tests unitarios con Testing Library.

### Fuera

- Videollamada / SDK de Vonage / petición de token (C3/C4).
- Toast "Visita finalizada" (C5).
- Cliente generado desde OpenAPI (C1) y tipos definitivos (T1).
- Router (`react-router`), login real, dashboard de gestora.
- Cambios de backend, `openapi.yaml` o `schema.prisma`.
- Framework de UI o CSS-in-JS.

---

## 3. Decisiones cerradas

| Decisión | Elección |
|---|---|
| Fuente de datos | API real (`GET /api/incidents/:id`); fixture mock solo para tests. |
| Ruta | Sin router: `?incidentId=<id>` de `window.location.search`; por defecto `inc_demo`. |
| Rol | Solo estado en memoria; por defecto `TENANT` (`usr_tenant_demo`). |
| Cambio de rol | No refetch: el payload de la incidencia no depende del rol. El rol se usará en C3 para pedir el token. |
| Fecha | `Intl.DateTimeFormat('es-ES', { dateStyle: 'long', timeStyle: 'short' })`. |
| IDs de demo | `inc_demo`, `usr_tenant_demo`, `usr_technician_demo` (seed). |

---

## 4. Contrato de datos

### Petición

```http
GET /api/incidents/:id
Accept: application/json
X-User-Id: usr_tenant_demo | usr_technician_demo
X-User-Role: TENANT | TECHNICIAN
```

> El backend actual **ignora** estas cabeceras en `GET /incidents/:id`; se envían
> ya para fijar el patrón que consumirá C3/A3.

### Respuesta usada por C2 (subconjunto del superset actual)

```ts
type IncidentDetailData = {
  id: string;
  title: string;
  description: string | null;
  status: 'REPORTED' | 'VISIT_ASSIGNED' | 'VIDEO_COMPLETED' | 'CLOSED';
  technician: { name: string } | null;
  visit: {
    scheduledAt: string;
    status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  } | null;
};
```

Tipo local marcado como **provisional** hasta C1 (no duplicar el contrato final).

### Errores

| Caso | Respuesta backend | UI |
|---|---|---|
| No existe | `404 { error: "Incident not found", id }` | "Incidencia no encontrada" |
| Fallo de red / 5xx | — | "No se pudo cargar la incidencia" |
| Cargando | — | "Cargando incidencia…" |

---

## 5. Comportamiento de UI

### Datos mostrados

- Título (`h1`).
- Descripción o "Sin descripción".
- Estado de la incidencia en español: `REPORTED` → "Reportada", `VISIT_ASSIGNED` → "Visita asignada", `VIDEO_COMPLETED` → "Vídeo completado", `CLOSED` → "Cerrada".
- Visita: fecha/hora formateada y estado (`CONFIRMED` → "Confirmada", etc.). Si no hay visita: "Sin visita".
- Técnica: `technician.name` o "Sin asignar".

### Selector de rol

- `<fieldset>` con dos `<input type="radio">` y `<label>`: "Inquilina" (`TENANT`) y "Técnica" (`TECHNICIAN`).
- Por defecto: "Inquilina".
- Al cambiar: actualiza el estado y el rol usado para las cabeceras.

### Botón "Entrar a la videollamada"

| `incident.status` | `visit.status` | Botón |
|---|---|---|
| `VISIT_ASSIGNED` | `CONFIRMED` | **Habilitado** · "Entrar a la videollamada" |
| `VIDEO_COMPLETED` | cualquiera | **Deshabilitado** · "Visita realizada" |
| cualquier otro / sin visita | — | **Deshabilitado** · "Videollamada no disponible" |

- En C2 el `onClick` no navega ni pide token; C3 lo cablea.
- Es un `<button type="button">` real (accesibilidad).

---

## 6. Ficheros afectados

| Archivo | Cambio |
|---|---|
| `frontend/src/pages/IncidentDetail.tsx` | **Nuevo.** Página: hook + selector + resumen + botón. |
| `frontend/src/api/incidents.ts` | **Nuevo.** Tipo provisional `IncidentDetailData` + `getIncident(id, role)` con cabeceras. |
| `frontend/src/hooks/useIncident.ts` | **Nuevo.** `useQuery(['incident', incidentId])` + cabeceras de rol. |
| `frontend/src/components/JoinButton.tsx` | **Nuevo.** Botón puro con la tabla de §5. |
| `frontend/src/test/fixtures/incident.ts` | **Nuevo.** Fixture `IncidentDetailData` + factoría con overrides. |
| `frontend/src/pages/IncidentDetail.test.tsx` | **Nuevo.** Tests de página, botón, loading, 404 y error. |
| `frontend/src/api/http.ts` | Extender `getJson` con `headers` opcionales y `HttpError` con `status`. |
| `frontend/src/App.tsx` | Renderizar `IncidentDetail` con el id de la URL (default `inc_demo`). |
| `frontend/src/App.test.tsx` | Sustituir el smoke de `/api/health` por el render de `IncidentDetail`. |
| `frontend/src/test/setup.ts` | Añadir `afterEach(cleanup)` para aislar el DOM entre tests. |

---

## 7. Criterios de aceptación (Given/When/Then)

1. **Datos y botón habilitado**
   Given una incidencia `VISIT_ASSIGNED` con visita `CONFIRMED`
   When se abre la pantalla
   Then muestra título, descripción, estado, fecha de visita y técnica
   And el botón "Entrar a la videollamada" está habilitado.

2. **Visita realizada**
   Given una incidencia `VIDEO_COMPLETED`
   When se abre la pantalla
   Then el botón está deshabilitado con el texto "Visita realizada".

3. **Estado no disponible**
   Given una incidencia `REPORTED`, `CLOSED` o sin visita confirmada
   When se abre la pantalla
   Then el botón está deshabilitado con el texto "Videollamada no disponible".

4. **Cargando**
   Given que la petición sigue en curso
   Then se muestra "Cargando incidencia…".

5. **404**
   Given que la API responde 404
   Then se muestra "Incidencia no encontrada".

6. **Error de red**
   Given que la petición falla sin 404
   Then se muestra "No se pudo cargar la incidencia".

7. **Rol**
   Given la pantalla cargada
   Then el rol por defecto es "Inquilina"
   And la petición se hizo con `X-User-Id: usr_tenant_demo` y `X-User-Role: TENANT`
   When se selecciona "Técnica"
   Then el selector refleja "Técnica".

8. **Id por defecto**
   Given una URL sin `incidentId`
   Then se usa `inc_demo`.

---

## 8. Errores y casos límite

- `visit: null` → "Sin visita" y botón "Videollamada no disponible".
- `technician: null` → "Sin asignar".
- `description: null` → "Sin descripción".
- Fecha inválida o nula → no romper: mostrar "Fecha no disponible".
- No se usa `any`; la respuesta se valida con un tipo local (sin zod en C2 porque no hay entrada de usuario; el rol se limita a los dos valores del enum).

---

## 9. Plan de tests (Vitest + Testing Library)

`frontend/src/pages/IncidentDetail.test.tsx`:

1. Renderiza datos con fixture `VISIT_ASSIGNED` + `CONFIRMED`.
2. Botón habilitado con texto "Entrar a la videollamada".
3. `VIDEO_COMPLETED` → deshabilitado "Visita realizada".
4. `REPORTED` → deshabilitado "Videollamada no disponible".
5. Loading → "Cargando incidencia…".
6. 404 (`HttpError` con `status: 404`) → "Incidencia no encontrada".
7. Error de red → "No se pudo cargar la incidencia".
8. Fetch recibe `X-User-Id: usr_tenant_demo` y `X-User-Role: TENANT`.
9. Cambio a "Técnica" actualiza el selector.

`frontend/src/App.test.tsx`: renderiza `IncidentDetail` con `inc_demo` por defecto.

Reglas: mock de `fetch` con `vi.stubGlobal`, `QueryClient` con `retry: false`, consultas por rol/texto, sin snapshots.

---

## 10. Riesgos

- El endpoint actual devuelve un **superset** de Prisma; C2 lee solo el subconjunto de §4 para no acoplarse. Al cerrar T1, reconciliar tipos.
- Extender `http.ts` es temporal: C1 lo sustituye por el cliente generado.
- Sin router, la URL es solo un parámetro de arranque; no hay navegación real (fuera del MVP).
- El rol no provoca refetch: si en el futuro la respuesta dependiera del rol, habría que añadirlo a la query key.

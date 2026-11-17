# 03 — Plan · C2 · Pantalla IncidentDetail

> **Issue:** [#18](https://github.com/femCodersClub-vonage-program/homefix-connect/issues/18)
> **Rama:** `feat/C2-incident-detail` · **Size:** S
> **Base:** `02-specification.md` (aprobada) · **Estado:** aprobado para implementación.

---

## 1. Ficheros afectados

### Nuevos

- `[NEW] frontend/src/api/incidents.ts` — Tipo provisional `IncidentDetailData`
  (+ `IncidentStatus`, `VisitStatus`, `UserRole`) y adaptador `getIncident(id, role)`
  que añade las cabeceras `X-User-Id`/`X-User-Role` sobre `getJson`.
- `[NEW] frontend/src/hooks/useIncident.ts` — `useQuery(['incident', incidentId])`
  con `queryFn = () => getIncident(incidentId, role)`.
- `[NEW] frontend/src/components/JoinButton.tsx` — Botón puro; recibe
  `incidentStatus`, `visitStatus` y `onClick` opcional.
- `[NEW] frontend/src/pages/IncidentDetail.tsx` — Página: selector de rol, datos,
  estados loading/404/error y `JoinButton`.
- `[NEW] frontend/src/test/fixtures/incident.ts` — `makeIncidentFixture(overrides)`.
- `[NEW] frontend/src/pages/IncidentDetail.test.tsx` — 9 casos de §9 de la spec.

### Modificados

- `[MODIFY] frontend/src/api/http.ts` — `HttpError { status }` y
  `getJson<T>(path, options?: { headers })`.
- `[MODIFY] frontend/src/App.tsx` — `getIncidentIdFromUrl(search)` (default
  `inc_demo`) y render de `IncidentDetail`.
- `[MODIFY] frontend/src/App.test.tsx` — Sustituye el smoke de `/api/health` por
  el render de la incidencia por defecto + tests de `getIncidentIdFromUrl`.
- `[MODIFY] frontend/src/test/setup.ts` — `afterEach(cleanup)` para que Testing
  Library limpie el DOM entre tests (Vitest sin `globals`).

### Sin cambios

- `backend/openapi.yaml`, `backend/prisma/schema.prisma`, `vite.config.ts`,
  `frontend/src/main.tsx`, `backend/*`.

---

## 2. Contratos y base de datos

- Sin cambios de contrato ni de BD.
- La respuesta se modela con un **tipo local provisional** hasta C1/T1.
- No se añaden dependencias: el cambio de rol en tests se hará con `fireEvent`
  (ya incluido en `@testing-library/react`); `user-event` no está instalado.

---

## 3. Estrategia TDD

### Fase roja

1. Crear fixture y `IncidentDetail.test.tsx` con los 9 casos.
2. Ejecutar `pnpm --filter frontend test` → falla (módulos inexistentes y
   comportamiento no implementado).

### Fase verde

Implementar en este orden hasta poner los tests en verde:

1. `http.ts` (`HttpError` + headers).
2. `api/incidents.ts` (tipos + `getIncident`).
3. `components/JoinButton.tsx`.
4. `hooks/useIncident.ts`.
5. `pages/IncidentDetail.tsx`.
6. `App.tsx` + `App.test.tsx`.

### Aislamiento

- `fetch` mockeado con `vi.stubGlobal`; sin red, sin cámara, sin SDK.
- `QueryClient` con `retry: false` para evitar reintentos en tests de error.
- Sin Postgres.

---

## 4. Orden de ejecución

1. Fixture + tests (rojo).
2. `http.ts` y `api/incidents.ts`.
3. `JoinButton`.
4. `useIncident`.
5. `IncidentDetail`.
6. `App` y `App.test.tsx`.
7. `pnpm --filter frontend test` (verde).
8. `pnpm check` (lint + typecheck).
9. `pnpm test` en la raíz.
10. Demo manual con backend + seed (`?incidentId=inc_demo`).

---

## 5. Riesgos y mitigación

- **Superset de la API actual:** leer solo el subconjunto de `02-specification.md`
  §4; no acoplarse a `tenant`, `manager` ni `videoSession`.
- **`http.ts` temporal:** C1 lo sustituirá por el cliente generado; mantener el
  cambio mínimo.
- **Cambio de rol sin refetch:** documentado en la spec; C3 usará el rol para
  pedir el token.
- **`App.test.tsx` actual:** se eliminan las aserciones de `/api/health`; el
  endpoint de salud sigue existiendo pero ya no es la pantalla principal.
- **Formato de fecha dependiente de ICU/timezone:** en tests no se asertará el
  texto exacto de la fecha, solo la etiqueta "Visita" y el estado.

---

## 6. Matriz de trazabilidad

| AC (02-specification) | Archivo / test |
|---|---|
| 1. Datos + botón habilitado | `IncidentDetail.test.tsx` · fixture `VISIT_ASSIGNED`+`CONFIRMED` |
| 2. "Visita realizada" | `IncidentDetail.test.tsx` · fixture `VIDEO_COMPLETED` |
| 3. "Videollamada no disponible" | `IncidentDetail.test.tsx` · fixture `REPORTED` |
| 4. Cargando | `IncidentDetail.test.tsx` · promesa pendiente |
| 5. 404 | `IncidentDetail.test.tsx` · `{ ok: false, status: 404 }` |
| 6. Error de red | `IncidentDetail.test.tsx` · `fetch` rechaza |
| 7. Rol por defecto y cambio | `IncidentDetail.test.tsx` · cabeceras + `fireEvent` |
| 8. Id por defecto | `App.test.tsx` · `getIncidentIdFromUrl('')` |
| Contrato del botón | `JoinButton` (cubierto vía página) |
| Contrato HTTP | `http.ts` (cubierto vía página) |

---

## 7. Verificación final

```bash
pnpm --filter frontend test
pnpm check
pnpm test
pnpm build
```

Evidencia en `04-validation.md` antes de abrir el PR.

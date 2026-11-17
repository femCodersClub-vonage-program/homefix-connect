# 04 — Validation · C2 · Pantalla IncidentDetail

> **Issue:** [#18](https://github.com/femCodersClub-vonage-program/homefix-connect/issues/18)
> **Rama:** `feat/C2-incident-detail`
> **Fecha:** 2026-11-16 · actualizada 2026-11-17 · **Entorno:** local (macOS),
> Node v24.22.3, pnpm 12.18.0.

---

## 1. Comandos y resultados

```text
$ nvm use 24
→ Now using node v24.22.3

$ pnpm install --frozen-lockfile
→ Lockfile is up to date · Done in 152ms

$ pnpm --filter frontend test
→ Test Files  2 passed (2)
→ Tests       12 passed (12)
   ✓ src/App.test.tsx (3 tests)
   ✓ src/pages/IncidentDetail.test.tsx (9 tests)

$ pnpm check
→ eslint OK
→ tsc --noEmit OK (backend + frontend)

$ pnpm test
→ backend:  Test Files 4 passed (4) · Tests 39 passed (39)
→ frontend: Test Files 2 passed (2) · Tests 12 passed (12)

$ pnpm build
→ backend:  tsc OK
→ frontend: 79 modules transformed
   dist/index.html                 0.40 kB │ gzip:  0.27 kB
   dist/assets/index-*.css         0.75 kB │ gzip:  0.43 kB
   dist/assets/index-*.js        259.09 kB │ gzip: 80.49 kB
   built in 551ms
```

### Incidencia durante la fase verde

Los tests encontraron varios `h1` con el mismo texto porque el DOM se acumulaba
entre casos: Vitest no tiene `test.globals` activo y el auto-cleanup de Testing
Library no se registra. Se añadió `afterEach(cleanup)` en
`frontend/src/test/setup.ts`; la suite pasó de `3 failed | 9 passed` a
`12 passed`. La validación completa se repitió con Node 24 (resultados de §1).

---

## 2. Trazabilidad criterio → test

### Criterios de aceptación (02-specification §7)

| AC | Test | Estado |
|---|---|---|
| 1. Datos + botón habilitado | `muestra los datos y el botón habilitado con visita confirmada` | ✅ |
| 2. "Visita realizada" | `deshabilita el botón con "Visita realizada" si la incidencia está VIDEO_COMPLETED` | ✅ |
| 3. "Videollamada no disponible" | `deshabilita el botón con "Videollamada no disponible" en otros estados` + `deshabilita el botón si no hay visita` | ✅ |
| 4. Cargando | `muestra el estado de carga` | ✅ |
| 5. 404 | `muestra "Incidencia no encontrada" cuando la API responde 404` | ✅ |
| 6. Error de red | `muestra un error genérico cuando la petición falla` | ✅ |
| 7. Rol por defecto y cambio | `envía las cabeceras del rol por defecto (inquilina)` + `permite cambiar el rol a técnica` | ✅ |
| 8. Id por defecto | `getIncidentIdFromUrl` · `usa inc_demo cuando la URL no trae incidentId` | ✅ |

### Integración con la app

| Caso | Test | Estado |
|---|---|---|
| Render por defecto | `App` · `renderiza la incidencia por defecto` | ✅ |
| Lectura de `?incidentId=` | `getIncidentIdFromUrl` · `lee incidentId de la URL` | ✅ |

---

## 3. Criterios del issue #18

- [x] Pantalla única con `?incidentId=` (sin router; evita añadir dependencia).
- [x] Muestra título, descripción, estado, visita (fecha/hora) y técnica.
- [x] Botón habilitado si `VISIT_ASSIGNED` + `CONFIRMED`.
- [x] Botón deshabilitado con "Visita realizada" si `VIDEO_COMPLETED`.
- [x] Estados de carga y error con TanStack Query.
- [x] Selector de rol (inquilina / técnica) que fija `X-User-Id` y `X-User-Role`.
- [x] Usa la API real (ya existe); el mock/fixture se limita a los tests.

### Desviaciones respecto al borrador del issue

- No se creó `components/IncidentCard.tsx`: la página compone directamente la
  tarjeta (KISS; el archivo queda por debajo de ~120 líneas). Se mantiene
  `components/JoinButton.tsx` como componente puro.
- Sin `react-router`: la ruta es una pantalla única con `?incidentId=`.

---

## 4. Revisión

- Sin cambios en `backend/openapi.yaml` ni `backend/prisma/schema.prisma`.
- Sin dependencias nuevas (`fireEvent` en vez de `user-event`).
- Sin secretos, tokens ni teléfonos reales en código, tests ni fixtures.
- Revalidado con **Node 24** (`.nvmrc`); el CI usa `node-version-file: .nvmrc`.

---

## 5. Pendientes fuera de C2

- Demo manual `?incidentId=inc_demo` con backend + seed: **pendiente**, el
  daemon de Docker no estaba arrancado en el entorno local.
- Reconciliar `IncidentDetailData` con los tipos generados en **C1** (T1 ya cerrado).
- Cablear el `onClick` del botón con el token de vídeo (**C3/C4**).

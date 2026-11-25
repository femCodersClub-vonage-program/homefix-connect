# 03 — Plan · C5 · Toast "Visita finalizada"

> **Issue:** [#21](https://github.com/femCodersClub-vonage-program/homefix-connect/issues/21)
> **Rama:** `feat/C5-finish-toast` · **Size:** XS
> **Base:** `02-specification.md` · **Estado:** aprobado el 2026-11-24 e implementado en `feat/C5-finish-toast`.
> Ver `04-validation.md` para la evidencia de ejecución.

---

## 1. Ficheros Afectados

### `[NEW]`

- `frontend/src/hooks/useFinishToast.ts`
  - Recibe `IncidentStatus | undefined`.
  - Detecta la transición a `VIDEO_COMPLETED`.
  - Gestiona el estado `visible` y el temporizador de 5 s con cleanup.
- `frontend/src/components/FinishToast.tsx`
  - Exporta `FINISH_TOAST_MESSAGE`.
  - Renderiza el `<p role="status" aria-live="polite">` cuando `open === true`.
- `frontend/src/components/FinishToast.test.tsx`
  - Comprueba mensaje exacto, atributos de accesibilidad y `null` cuando cerrado.

### `[MODIFY]`

- `frontend/src/hooks/useIncident.ts`
  - Añade `refetchInterval` de `5_000` ms mientras `status !== 'VIDEO_COMPLETED'`.
  - Devuelve `false` al completarse para detener el polling.
- `frontend/src/pages/IncidentDetail.tsx`
  - Llama a `useFinishToast(incident.data?.status)` antes de los early returns.
  - Renderiza `<FinishToast open={showFinishToast} />`.
- `frontend/src/pages/IncidentDetail.test.tsx`
  - Extrae un helper que expone el `QueryClient` para poder refetchear.
  - Añade respuestas controladas por llamada para simular el cambio de estado.
  - Usa temporizadores falsos para el auto-dismiss y el polling.
- `frontend/src/index.css`
  - Añade `.toast` con estilo fijo mínimo.
- `frontend/AGENTS.md`
  - Actualiza el mapa de carpetas con `FinishToast` / `useFinishToast`.
  - Añade una nota breve en §5 sobre el toast de C5.

### Sin cambios

- `backend/*`, `backend/openapi.yaml`, `backend/prisma/schema.prisma`.
- `frontend/src/api/*`, `frontend/src/components/JoinButton.tsx`.
- `frontend/package.json`, `pnpm-lock.yaml`, `vite.config.ts`.

---

## 2. Cambios en Contratos y Base de Datos

- No aplica. No se tocan `openapi.yaml` ni `schema.prisma`.
- No se ejecuta `pnpm gen:types` ni `pnpm db:*`.
- No se añaden dependencias: se usa TanStack Query y CSS plano ya fijados.

---

## 3. Estrategia TDD

### Fase roja

1. Escribir `FinishToast.test.tsx`:
   - mensaje exacto visible con `open=true`;
   - `role="status"` y `aria-live="polite"`;
   - `container.firstChild` es `null` con `open=false`.
2. Ampliar `IncidentDetail.test.tsx`:
   - no muestra toast si la primera respuesta ya es `VIDEO_COMPLETED`;
   - muestra el toast cuando un refetch cambia `VISIT_ASSIGNED` → `VIDEO_COMPLETED`;
   - desaparece tras 5 s;
   - no se duplica con refetchs repetidos;
   - el botón sigue deshabilitado con "Visita realizada".
3. Ejecutar `pnpm --filter frontend test` y comprobar que falla por comportamiento
   ausente, no por error de entorno.

### Fase verde

1. Crear `useFinishToast.ts` con la lógica de transición y temporizador.
2. Crear `FinishToast.tsx` y exportar el mensaje.
3. Modificar `useIncident.ts` con `refetchInterval`.
4. Modificar `IncidentDetail.tsx` para consumir el hook y renderizar el toast.
5. Añadir `.toast` en `index.css`.
6. Actualizar `frontend/AGENTS.md`.
7. Repetir tests hasta verde.

### Mocks y dobles

- `vi.stubGlobal('fetch', fetchMock)` con una cola de respuestas por llamada.
- `QueryClient` creado en el test con `retry: false`.
- `vi.useFakeTimers()` para avanzar 5 s; `vi.useRealTimers()` en `afterEach`.
- Sin backend, sin red, sin SDK de Vonage y sin librería de toast.

---

## 4. Orden Secuencial de Ejecución

1. Tras aprobar este plan, crear `feat/C5-finish-toast` desde `origin/main`.
2. Escribir los tests en rojo y verificar los fallos esperados.
3. Implementar el hook y el componente nuevos.
4. Añadir polling a `useIncident`.
5. Integrar en `IncidentDetail`.
6. Ajustar CSS y `frontend/AGENTS.md`.
7. Ejecutar `pnpm --filter frontend test`, `pnpm check`, `pnpm test` y `pnpm build`.
8. Escribir `04-validation.md` con evidencia real.
9. Preparar commit/PR y esperar autorización para publicar.

---

## 5. Riesgos Técnicos y Mitigaciones

- **Reglas de hooks:** `useFinishToast` se llama antes de los early returns de
  `IncidentDetail`; si no, el número de hooks cambiaría entre renderizados.
- **Temporizador huérfano:** el efecto limpia el `setTimeout` al cambiar `status`
  o al desmontar.
- **Toast en carga inicial:** `previousStatus === undefined` bloquea el aviso.
- **StrictMode:** el doble mount/cleanup cancela el primer temporizador; solo
  queda el del segundo efecto.
- **Polling extra:** se detiene al llegar a `VIDEO_COMPLETED` para no consultar
  indefinidamente.
- **Regresión de C2:** `JoinButton` no se modifica; los tests existentes de
  "Visita realizada" deben seguir pasando.
- **Tests con temporizadores:** se usan `act()` y `waitFor()` con cuidado para
  evitar carreras entre React Query y los falsos temporizadores.

---

## 6. Matriz de Trazabilidad

| AC (`02-specification.md`) | Validación |
|---|---|
| 1. Aviso en la transición | `IncidentDetail.test.tsx` · refetch `VISIT_ASSIGNED` → `VIDEO_COMPLETED` |
| 2. Sin aviso en carga inicial | `IncidentDetail.test.tsx` · primera respuesta completada |
| 3. Auto-dismiss | `IncidentDetail.test.tsx` · `vi.advanceTimersByTime(5000)` |
| 4. Sin duplicados | `IncidentDetail.test.tsx` · refetchs repetidos |
| 5. Accesibilidad | `FinishToast.test.tsx` · `role="status"` + `aria-live` |
| 6. Botón intacto | `IncidentDetail.test.tsx` · test existente de "Visita realizada" |
| 7. Polling | `IncidentDetail.test.tsx` · segunda llamada a `/api/incidents/inc_demo` tras 5 s |
| 8. Aislamiento | Tests con `fetch` mockeado y sin dependencias nuevas |

---

## 7. Verificación Final

```bash
pnpm --filter frontend test
pnpm check
pnpm test
pnpm build
```

No hay demo manual obligatoria en C5: el cambio es puramente de UI y se valida
con tests. Si se hace demo, basta con cargar `/?incidentId=inc_demo`, forzar el
cambio de estado en backend/seed y recargar/refrescar la query.

---

## 8. Fuera de este Plan

- No publicar el issue, el comentario de refinamiento, el commit, la rama ni el
  PR sin autorización explícita.
- No tocar backend, contrato, schema, dependencias ni ramas ajenas.
- No implementar C6 ni C7 dentro de este PR.

# 01 — Requirements · C1 · Cliente API generado desde OpenAPI

> **Issue:** [#17](https://github.com/femCodersClub-vonage-program/homefix-connect/issues/17)
> **Rama sugerida:** `feat/C1-api-client` · **Size:** XS
> **Fuente de alcance:** `docs/TASKS.md` §7 y §11 · `docs/ARCHITECTURE.md` ADR-006
> **Estado:** análisis y clarificación (SDD-02/03). Pendiente de aprobación de la spec y el plan.

---

## 1. Resumen del Problema

El contrato vive en `backend/openapi.yaml` (T1), pero el frontend todavía
declara a mano los tipos que consume. C2 dejó tipos provisionales
(`IncidentDetailData`, `IncidentStatus`, `VisitStatus`, `UserRole`) y un
`getJson<T>()` que no conoce el contrato. Mantener esa duplicación garantiza
desincronización cuando T1 evolucione y obliga a C3/C4/C5 a escribir más tipos
manuales.

**Valor de negocio:** una única fuente de verdad para la API, tipos generados y
commiteados, y una base estable para las tareas de videollamada y notificaciones.
Reduce retrabajo y hace visible cualquier cambio de contrato en el PR.

**Consumidores:** C2 (ya mergeada), C3, C4 y C5 en el frontend. El backend no
cambia.

---

## 2. Casos de Uso Afectados

C1 no añade un caso de uso de negocio; habilita la capa de datos de los
existentes.

| Escenario | Relación con C1 |
|---|---|
| **1 y 2 — Inquilina/técnica entran a la videollamada** | C2 y C3 consumen `Incident`, `Role` y, en C3, `VideoTokenRequest`/`VideoTokenResponse` generados. |
| **4 — Fin de visita** | C4/C5 podrán usar los tipos de `Error` y de sesión sin duplicarlos. |
| **3 — SMS post-visita** | No se consume desde el frontend; no añade contrato nuevo. |

---

## 3. Comportamiento Actual vs Esperado

### Hoy

- `backend/openapi.yaml` define `Incident`, `Role`, `IncidentStatus`,
  `VisitStatus`, `VideoTokenRequest` y `VideoTokenResponse`.
- `frontend/src/api/incidents.ts` declara enums y `IncidentDetailData` a mano,
  marcados como provisionales.
- `frontend/src/api/http.ts` es un `getJson<T>()` genérico con un comentario que
  lo declara provisional.
- No existe `pnpm gen:types` ni código generado.
- `frontend/src/test/fixtures/incident.ts` construye un objeto que solo cumple
  el subconjunto local, no el schema `Incident` completo.

### Esperado tras C1

- `pnpm gen:types` en la raíz genera
  `frontend/src/api/generated/openapi.d.ts` desde `backend/openapi.yaml`.
- El archivo generado se commitea y **no se edita a mano**.
- `incidents.ts` deriva sus tipos de `components['schemas']`; no quedan enums ni
  interfaces duplicadas.
- `http.ts` deja de ser provisional: se sustituye por
  `frontend/src/api/client.ts`, un transporte fino tipado (sin cliente runtime
  generado).
- Un test de tipos comprueba que los alias del frontend coinciden con el schema
  generado.
- `pnpm check`, `pnpm test` y `pnpm build` siguen en verde; el comportamiento de
  C2 no cambia.
- Se documenta la decisión en `docs/ARCHITECTURE.md` (ADR-013).

---

## 4. Fuera de Alcance

- ❌ Generar un cliente runtime (`openapi-fetch`, `orval` u otro). La decisión
  del equipo es `openapi-typescript` (solo tipos).
- ❌ Añadir `postJson`/peticiones nuevas; C3 lo hará cuando necesite
  `POST /video-tokens`.
- ❌ Cambiar `backend/openapi.yaml`, `schema.prisma` o cualquier ruta del backend.
- ❌ Cambiar el contrato para “arreglar” tipos; si algo no encaja, se ajusta el
  consumo del frontend.
- ❌ Lógica de videollamada, SDK de Vonage, SMS, router o estado global.
- ❌ Añadir un check de frescura del generado al CI; queda como follow-up.
- ❌ Sustituir TanStack Query o cambiar el patrón de hooks.

---

## 5. Dependencias

### Hard

- **T1** · `backend/openapi.yaml` mergeado. Ya está en `main`.

### Soft

| Dependencia | Uso | Estado |
|---|---|---|
| **C2** | Consume los tipos que C1 reemplaza | Mergeada en `main` |
| **A2/A3** | Forma de `VideoTokenRequest`/`Response` | Mergeadas en `main`; C1 solo genera sus tipos |

No hay dependencia de A4 ni de las tareas de SMS.

---

## 6. Trazabilidad de Código

| Archivo | Qué aporta / por qué se toca |
|---|---|
| `package.json` (raíz) | Nueva devDependency `openapi-typescript` y script `gen:types`. |
| `pnpm-lock.yaml` | Resolución reproducible de la nueva devDependency. |
| `backend/openapi.yaml` | Fuente de verdad; **no se modifica**. |
| `[NEW] frontend/src/api/generated/openapi.d.ts` | Salida generada y commiteada. |
| `[NEW] frontend/src/api/client.ts` | Transporte `getJson` + `HttpError`, antes en `http.ts`. |
| `frontend/src/api/incidents.ts` | Alias de tipos generados + `getIncident`. |
| `frontend/src/pages/IncidentDetail.tsx` | Import de `HttpError` desde `client.js`. |
| `frontend/src/test/fixtures/incident.ts` | Fixture completa según el schema `Incident`. |
| `[NEW] frontend/src/api/types.test.ts` | Test de tipos con `expectTypeOf`. |
| `docs/ARCHITECTURE.md` | ADR-013: generación de tipos y rechazo de cliente runtime. |
| `AGENTS.md` y `frontend/AGENTS.md` | Dejar de describir `gen:types`/`http.ts` como pendientes. |
| `specs/features/C1-api-client/*` | Requisitos, spec y plan de esta tarea. |

---

## 7. Decisiones Cerradas (entrada para SDD-04)

| Pregunta | Decisión |
|---|---|
| ¿Qué herramienta? | `openapi-typescript` como devDependency de la raíz. |
| ¿Genera cliente runtime? | No: solo tipos. Se descarta `openapi-fetch`/`orval` por KISS/YAGNI. |
| ¿Dónde se ejecuta? | Script `gen:types` en la raíz, para que orqueste backend → frontend. |
| ¿Dónde se guarda? | `frontend/src/api/generated/openapi.d.ts`, commiteado. |
| ¿Se edita a mano? | Nunca; se regenera con `pnpm gen:types`. |
| ¿Qué pasa con `http.ts`? | Se sustituye por `client.ts`; mismo comportamiento, sin marca de provisional. |
| ¿Cómo se tipa el rol? | `UserRole = Extract<Role, 'TENANT' \| 'TECHNICIAN'>`; la UI no ofrece `MANAGER`. |
| ¿Cómo se tipa la incidencia? | `IncidentDetailData = components['schemas']['Incident']`. |
| ¿Se añade POST? | No; C3 añadirá `postJson` cuando consuma `POST /video-tokens`. |
| ¿Se verifica en CI que el generado esté al día? | No en C1; se valida en local con `git diff --exit-code` tras regenerar. |
| ¿Se actualiza el fixture de C2? | Sí: `technician.id` y `visit.id`/`videoSession` que exige el schema. |

---

## 8. Riesgos

- **Forma generada distinta de la asumida:** `openapi-typescript` puede emitir
  `null`/uniones con una forma concreta. Mitigación: `pnpm check` y el test de
  tipos; se ajusta el consumo, nunca `openapi.yaml`.
- **Archivo generado ruidoso o conflictivo:** se regenera al cambiar el
  contrato y no se revisa línea a línea; el PR debe indicar que es generado.
- **Deriva del generador:** la versión queda fijada en `pnpm-lock.yaml`; se
  actualiza en un PR consciente.
- **Dependencia de raíz para todo el monorepo:** es una devDependency de
  codegen; no afecta al runtime ni al bundle del frontend.
- **Renombrar `http.ts` toca C2:** solo cambia el import de `HttpError` y
  `getJson`; los tests de C2 cubren el comportamiento.

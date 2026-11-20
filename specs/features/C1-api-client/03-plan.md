# 03 — Plan · C1 · Cliente API generado desde OpenAPI

> **Issue:** [#17](https://github.com/femCodersClub-vonage-program/homefix-connect/issues/17)
> **Rama:** `feat/C1-api-client` · **Size:** XS
> **Base:** `02-specification.md` · **Estado:** pendiente de aprobación explícita.
> **No crear rama ni escribir código hasta el OK.**

---

## 1. Ficheros Afectados

### Nuevos

| Archivo | Contenido |
|---|---|
| `frontend/src/api/generated/openapi.d.ts` | Salida de `openapi-typescript`; commiteada, nunca editada a mano. |
| `frontend/src/api/client.ts` | `HttpError` + `getJson<T>` movidos desde `http.ts`, sin cambios funcionales. |
| `frontend/src/api/types.test.ts` | 3 tests de tipos con `expectTypeOf`. |
| `specs/features/C1-api-client/01-requirements.md` | Requisitos y decisiones. |
| `specs/features/C1-api-client/02-specification.md` | Contrato de generación y tipos. |
| `specs/features/C1-api-client/03-plan.md` | Este plan. |

### Modificados

| Archivo | Cambio |
|---|---|
| `package.json` (raíz) | `devDependencies.openapi-typescript` + script `gen:types`. |
| `pnpm-lock.yaml` | Resolución de la nueva devDependency. |
| `frontend/src/api/incidents.ts` | Alias de `components['schemas']`; `getJson` desde `client.js`. |
| `frontend/src/pages/IncidentDetail.tsx` | `HttpError` desde `../api/client.js`. |
| `frontend/src/test/fixtures/incident.ts` | `technician.id`, `visit.id`, `videoSession`. |
| `docs/ARCHITECTURE.md` | ADR-013. |
| `AGENTS.md` | Eliminar la nota de que `gen:types` “todavía no existe”. |
| `frontend/AGENTS.md` | Mapa de `api/`, nota de tipos generados y `http.ts` → `client.ts`. |
| `docs/TASKS.md` | Marcar/actualizar C1 solo al cerrar el PR, si el flujo lo pide. |

### Eliminados

- `frontend/src/api/http.ts`.

### Sin cambios

- `backend/openapi.yaml`, `backend/prisma/schema.prisma`, backend completo.
- `frontend/src/App.tsx`, hooks, componentes, estilos, `vite.config.ts`.
- `.github/workflows/`.

---

## 2. Orden de Ejecución

### Fase roja

1. Crear `frontend/src/api/types.test.ts` importando
   `./generated/openapi.js` y los alias que aún no existen.
2. Ejecutar `pnpm --filter frontend typecheck` → falla por módulo/tipos
   inexistentes (Vitest no comprueba tipos).
3. (Opcional) `pnpm --filter frontend test` → los tests de tipos pasan porque
   esbuild strips types; el rojo real está en `typecheck`.

### Fase verde

4. Añadir la devDependency:
   ```bash
   pnpm add -Dw openapi-typescript
   ```
   La versión estable resuelta queda en `pnpm-lock.yaml` y se menciona en el PR.
5. Añadir el script raíz:
   ```json
   "gen:types": "openapi-typescript backend/openapi.yaml -o frontend/src/api/generated/openapi.d.ts"
   ```
6. Ejecutar `pnpm gen:types` y verificar la salida.
7. Crear `client.ts` moviendo el contenido de `http.ts`; borrar `http.ts`.
8. Refactorizar `incidents.ts` a los alias generados.
9. Actualizar el import de `HttpError` en `IncidentDetail.tsx`.
10. Actualizar la fixture de C2.
11. Añadir ADR-013 y actualizar `AGENTS.md`/`frontend/AGENTS.md`.
12. Ejecutar la suite completa y corregir solo lo que falle por tipos.

### Cierre

13. `pnpm gen:types` una segunda vez y comprobar que no hay diff.
14. `pnpm check && pnpm test && pnpm build`.
15. Revisar el diff: generado + lockfile + tipos + docs; sin cambios de backend.

---

## 3. Estrategia TDD

| Fase | Qué se escribe | Qué debe pasar |
|---|---|---|
| Rojo | `types.test.ts` con los 3 `expectTypeOf` | Falla: no existe `generated/openapi` ni los alias. |
| Verde | Generación + alias + transporte | Los 3 tests pasan y C2 sigue igual. |
| Regresión | Tests de C2 sin cambios | 12/12 pasan. |

No se añaden tests de runtime nuevos: C1 no cambia comportamiento. El test de
tipos es la red de seguridad contra la duplicación manual.

---

## 4. Riesgos y Mitigación

| Riesgo | Mitigación |
|---|---|
| El generador emite una forma distinta para `null`/`oneOf` | `pnpm check` + test de tipos; ajustar el consumo, no `openapi.yaml`. |
| El archivo generado mete ruido en el diff | Se indica en el PR que es generado; no se revisa línea a línea. |
| `openapi-typescript` añade una versión incompatible con Node 24 | Usar la última estable; si falla, fijar la última compatible y anotarlo en el PR. |
| El rename `http.ts` → `client.ts` rompe imports | Buscar con `rg` todos los imports de `http`; solo hay `incidents.ts` e `IncidentDetail.tsx`. |
| El generado se desactualiza en el futuro | Follow-up: check de frescura en CI; fuera de C1. |
| La fixture de C2 se vuelve más verbosa | Es el coste de cumplir el schema; no cambia ningún test visible. |

---

## 5. Validación y Evidencia

```bash
pnpm gen:types
pnpm gen:types
git diff --exit-code -- frontend/src/api/generated/openapi.d.ts
pnpm check
pnpm test
pnpm build
```

Evidencia para el PR:

- Salida de `pnpm gen:types` (sin errores).
- Confirmación de que la segunda ejecución no deja diff.
- `pnpm check`: sin errores.
- `pnpm test`: backend 52 · frontend 15 (12 + 3 de tipos).
- `pnpm build`: correcto.
- `git status`: generado, lockfile, `client.ts`, `incidents.ts`, fixture, docs.

---

## 6. Fuera de Este Plan

- `postJson` y consumo de `POST /video-tokens` (C3).
- `VideoSession`/`session.end` y SMS (C4/C5).
- Check de generado en CI.
- Cambios de contrato o de backend.
- Cualquier refactor de UI.

---

## 7. Aprobación

Para arrancar hacen falta dos OK explícitos:

1. **Spec** (`02-specification.md`): herramienta, salida, alias y rename.
2. **Plan** (este archivo): orden, ficheros y validación.

Después: crear `feat/C1-api-client`, volcar el refinamiento al issue #17 y
empezar por el test de tipos en rojo.

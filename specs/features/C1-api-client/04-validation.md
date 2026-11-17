# 04 — Validation · C1 · Cliente API generado desde OpenAPI

> **Issue:** [#17](https://github.com/femCodersClub-vonage-program/homefix-connect/issues/17)
> **Rama:** `feat/C1-api-client`
> **Fecha:** 2026-11-17 · **Entorno:** local (macOS), Node v24.22.3, pnpm 12.18.0,
> openapi-typescript 7.13.0.

---

## 1. Comandos y resultados

```text
$ nvm use 24
→ Now using node v24.22.3

$ pnpm add -Dw openapi-typescript
→ + openapi-typescript 7.13.0 · lockfile actualizado

$ pnpm gen:types
→ ✨ openapi-typescript 7.13.0
→ 🚀 backend/openapi.yaml → frontend/src/api/generated/openapi.d.ts [19.6ms]

$ pnpm gen:types && git diff --exit-code -- frontend/src/api/generated/openapi.d.ts
→ gen:types idempotente: OK

$ pnpm check
→ eslint OK
→ tsc --noEmit OK (backend + frontend)

$ pnpm test
→ backend:  Test Files 5 passed (5) · Tests 52 passed (52)
→ frontend: Test Files 3 passed (3) · Tests 15 passed (15)
   ✓ src/api/types.test.ts (3 tests)
   ✓ src/App.test.tsx (3 tests)
   ✓ src/pages/IncidentDetail.test.tsx (9 tests)

$ pnpm build
→ backend:  tsc OK
→ frontend: 84 modules transformed
   dist/index.html                 0.40 kB │ gzip:  0.27 kB
   dist/assets/index-*.css         0.75 kB │ gzip:  0.43 kB
   dist/assets/index-*.js        477.49 kB │ gzip: 143.53 kB
   built in 757ms
```

> El bundle local de 477 kB se debe al `.env` de la raíz con
> `NODE_ENV=development`, que Vite carga por `envDir: '..'` y hace que se
> empaquete React en modo dev. En CI (sin `.env`) el build sigue siendo de
> producción (~259 kB). Es una observación preexistente, no un cambio de C1.

### Fase roja (TDD)

```text
$ pnpm --filter frontend typecheck
→ src/api/types.test.ts(3,33): error TS2307: Cannot find module './generated/openapi.js'
→ src/api/types.test.ts(4,35): error TS2305: Module './incidents.js' has no exported member 'Role'
```

Vitest no comprueba tipos: los 3 tests de tipos pasan en rojo porque esbuild
elimina los imports de tipo. El fallo real se confirmó con `tsc --noEmit` y se
corrigió al generar los tipos y crear los alias.

---

## 2. Trazabilidad criterio → evidencia

| Criterio (02-specification §9) | Evidencia | Estado |
|---|---|---|
| `gen:types` existe y genera la salida | `pnpm gen:types` + archivo `openapi.d.ts` | ✅ |
| Segunda ejecución sin diff | `git diff --exit-code` → OK | ✅ |
| Generado commiteado | `git status` incluye `frontend/src/api/generated/openapi.d.ts` | ✅ |
| Sin enums/interfaces de API a mano | `incidents.ts` solo exporta alias de `components['schemas']` | ✅ |
| `http.ts` eliminado, `client.ts` conserva `HttpError`/`getJson` | `git mv` + 15 tests en verde | ✅ |
| `UserRole` excluye `MANAGER`; `Role` lo incluye | Tests `UserRole excluye MANAGER` / `Role incluye MANAGER` | ✅ |
| Test de tipos pasa | `src/api/types.test.ts` (3 tests) | ✅ |
| C2 sin cambios de comportamiento | 9 tests de `IncidentDetail` + 3 de `App` en verde | ✅ |
| `check`/`test`/`build` verdes | §1 | ✅ |
| ADR-013 y guías actualizadas | `docs/ARCHITECTURE.md`, `AGENTS.md`, `frontend/AGENTS.md` | ✅ |
| Sin cambios de contrato/backend | `git status`: `openapi.yaml` y `schema.prisma` intactos | ✅ |

---

## 3. Diff revisado

```text
 M AGENTS.md
 M docs/ARCHITECTURE.md
 M frontend/AGENTS.md
RM frontend/src/api/http.ts -> frontend/src/api/client.ts
 M frontend/src/api/incidents.ts
 M frontend/src/pages/IncidentDetail.tsx
 M frontend/src/test/fixtures/incident.ts
 M package.json
 M pnpm-lock.yaml
?? frontend/src/api/generated/openapi.d.ts
?? frontend/src/api/types.test.ts
?? specs/features/C1-api-client/
```

`git diff --check`: sin errores.

---

## 4. Demo local

C1 no cambia el comportamiento visible: no se repite la demo manual de C2. El
mismo flujo sigue válido:

```text
curl http://localhost:3000/api/health
curl http://localhost:3000/api/incidents/inc_demo
http://localhost:5173/?incidentId=inc_demo
```

Los tipos ahora vienen del generado, pero la UI, las cabeceras y los estados son
idénticos a los validados en C2.

---

## 5. Pendientes / follow-ups

- Añadir al CI un check de frescura del generado (`pnpm gen:types` + diff) en un
  PR de infra, fuera de C1.
- Revisar el `NODE_ENV=development` del `.env` compartido para que el build local
  empaquete React en producción; se comentará en la reunión.
- C3 añadirá `postJson` a `client.ts` para `POST /video-tokens`.

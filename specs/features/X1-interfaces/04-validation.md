# 04 — Validation · X1 · Interfaces + stubs

> **Issue:** [#4](https://github.com/femCodersClub-vonage-program/homefix-connect/issues/4)
> **Rama:** `feat/X1-interfaces` · **PR:** [#30](https://github.com/femCodersClub-vonage-program/homefix-connect/pull/30)
> **Fecha:** 2026-11-16 · **Entorno:** local (macOS) + GitHub Actions.

---

## 1. Comandos y resultados

```text
$ pnpm install --frozen-lockfile
→ OK

$ pnpm --filter backend db:generate
→ Prisma Client generado

$ pnpm --filter backend test
→ Test Files  2 passed (2)
→ Tests       16 passed (16)
   ✓ src/__tests__/stubs.test.ts (12 tests)
   ✓ src/__tests__/app.test.ts    (4 tests)

$ pnpm check
→ eslint OK
→ tsc --noEmit OK (backend + frontend)
```

CI del código (commit `afb5647`): `lint · typecheck · test · build` → **pass**.

---

## 2. Trazabilidad criterio → test

| Criterio (02-specification) | Test en `stubs.test.ts` | Estado |
|---|---|---|
| VideoService.createSession devuelve id | `cumple el contrato VideoService y crea una sesión con id` | ✅ |
| VideoService.generateToken caduca en futuro | `genera un token con caducidad futura` | ✅ |
| MessagingService.sendSms devuelve id | `cumple el contrato MessagingService y devuelve un providerMessageId` | ✅ |
| IncidentRepo.findById encuentra | `cumple el contrato IncidentRepo y encuentra una incidencia por id` | ✅ |
| IncidentRepo.findById inexistente → null | `devuelve null cuando la incidencia no existe` | ✅ |
| IncidentRepo.updateStatus persiste | `actualiza el estado de una incidencia existente` | ✅ |
| VideoSessionRepo.findByVisitId | `cumple el contrato VideoSessionRepo y encuentra la sesión por visitId` | ✅ |
| VideoSessionRepo.findByVonageSessionId con visit | `encuentra la sesión por vonageSessionId con su visita` | ✅ |
| VideoSessionRepo.findBy* inexistente → null | `devuelve null cuando no encuentra la sesión` | ✅ |
| VideoSessionRepo.update guarda id y activa | `guarda el vonageSessionId y activa la sesión` | ✅ |
| update no borra vonageSessionId al cerrar | `cierra la sesión sin borrar el vonageSessionId` | ✅ |
| update inexistente → error | `lanza error al actualizar una sesión inexistente` | ✅ |

---

## 3. Criterios del issue #4

- [x] `VideoService` (interface + stub) en `src/services/video.service.ts`.
- [x] `MessagingService` (interface + stub) en `src/services/messaging.service.ts`.
- [x] `IncidentRepo` (interface + stub) en `src/repositories/incident.repo.ts`.
- [x] `VideoSessionRepo` (interface + stub) en `src/repositories/video-session.repo.ts`.
- [x] Cada stub implementa los métodos que necesitan A1/A2, B1/B2/B3 y C1/C2.
- [x] Test unitario que verifica que los stubs cumplen su interface.

---

## 4. Revisión

- PR #30: `APPROVED` (silverxmary) · `MERGEABLE` · `CLEAN`.
- Sin cambios en `openapi.yaml` ni `schema.prisma`.
- Sin secretos, tokens ni teléfonos reales en código, tests ni fixtures.

---

## 5. Pendientes fuera de X1

- Reconciliar firmas con **T1** cuando se cierre.
- Cablear repos/servicios en rutas: corresponde a A1/A3/A4/B3.
- La verificación de firma de webhooks (**X3**) y el webhook (**A4**) quedan
  pendientes de la decisión de alcance de la mentora.

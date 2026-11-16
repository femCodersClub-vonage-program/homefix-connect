# 03 — Plan · X1 · Interfaces + stubs

> **Issue:** [#4](https://github.com/femCodersClub-vonage-program/homefix-connect/issues/4)
> **Rama:** `feat/X1-interfaces` · **PR:** [#30](https://github.com/femCodersClub-vonage-program/homefix-connect/pull/30)
> **Estado:** ejecutado (plan reconstruido para el framework SDD).

---

## 1. Enfoque

TDD ligero: un test de contrato por interface antes de la implementación. Como
son stubs, el test verifica la forma y la semántica (no llamadas externas).

Sin nuevas dependencias, sin tocar `openapi.yaml` ni `schema.prisma`.

---

## 2. Orden de ejecución

| Paso | Archivo | Contenido |
|---|---|---|
| 1 | `src/services/video.service.ts` | `VideoService` + `InMemoryVideoService` |
| 2 | `src/services/messaging.service.ts` | `MessagingService` + `InMemoryMessagingService` |
| 3 | `src/repositories/incident.repo.ts` | `IncidentRepo` + `InMemoryIncidentRepo` + `IncidentWithRelations` |
| 4 | `src/repositories/video-session.repo.ts` | `VideoSessionRepo` + `InMemoryVideoSessionRepo` + `VideoSessionWithVisit` |
| 5 | `src/__tests__/stubs.test.ts` | Tests de contrato de los cuatro stubs |

Motivo del orden: primero los servicios (más simples), luego los repos, y el
repo de sesión al final porque depende del tipo `Visit` de Prisma.

---

## 3. Ficheros afectados

- **Nuevos:** `src/services/video.service.ts`, `src/services/messaging.service.ts`,
  `src/repositories/incident.repo.ts`, `src/repositories/video-session.repo.ts`,
  `src/__tests__/stubs.test.ts`.
- **Modificado:** `.github/workflows/ci.yml` (generar Prisma Client antes del
  typecheck; ver §5).
- **Sin cambios:** `openapi.yaml`, `schema.prisma`, rutas, `app.ts`.

---

## 4. Verificación

```bash
pnpm install --frozen-lockfile
pnpm --filter backend db:generate
pnpm --filter backend test
pnpm check
```

Criterio de verde: 0 errores de lint/typecheck y todos los tests en verde.

---

## 5. Riesgos y mitigación

- **Prisma Client no generado en CI** → `tsc` fallaba con `TS2305` en los enums.
  Mitigación aplicada: paso `Generate Prisma Client`
  (`pnpm --filter backend db:generate`) tras `Install` en `ci.yml`.
- **Firmas provisionales** → al cerrar T1 pueden cambiar; se reconcilia en el PR
  consumidor sin romper los stubs (misma interface).
- **Confusión de agregados** → se descartó ampliar `IncidentRepo`; repo dedicado
  para `VideoSession`.
- **Scope del issue (3 interfaces)** → cuarta interface justificada en #4 y en el
  PR; aprobada por la mentora.

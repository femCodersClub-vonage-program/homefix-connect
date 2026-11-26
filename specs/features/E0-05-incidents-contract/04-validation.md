# E0-05 · Validación

> 25/11/2026 · rama `fix/E0-05-incidents-contract` sobre `main` @ `027c7c0`

```text
$ pnpm gen:types   → openapi.d.ts regenerado (cabeceras obligatorias, 401/403/500)
$ pnpm check       → sin errores
$ pnpm test        → backend 14 files · 154 passed · frontend 6 files · 54 passed
$ pnpm build       → OK
```

**Pendiente en local (Docker):** `pnpm --filter backend test:integration` (INT-I1…INT-I3 nuevos). La CI lo ejecuta en el PR.

## Criterio de aceptación (#64)

- [x] Ruta con `IncidentRepo` inyectado
- [x] 401 sin cabeceras
- [x] 403 sin pertenencia
- [x] OpenAPI con 401/403
- [x] Contract tests de incidents y health

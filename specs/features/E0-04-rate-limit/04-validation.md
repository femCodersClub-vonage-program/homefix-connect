# E0-04 · Validación

> 25/11/2026 · rama `fix/E0-04-rate-limit` sobre `main` @ `027c7c0`

```text
$ pnpm gen:types   → openapi.d.ts regenerado con el 429
$ pnpm check       → sin errores
$ pnpm test        → backend 13 files · 151 passed · frontend 6 files · 54 passed
$ pnpm build       → OK
```

Pendiente en local: prueba manual con `curl` (11 peticiones seguidas → la última 429 con `Retry-After`).

## Criterio de aceptación (#63)

- [x] Límite configurable (10/min por usuario por defecto)
- [x] 429 con `Retry-After`
- [x] Tests unitarios + de contrato con el 429
- [x] `openapi.yaml` con el 429

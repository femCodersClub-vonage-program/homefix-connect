# E0-02 · Validación

> 25/11/2026 · rama `fix/E0-02-session-destroyed` sobre `main` @ `027c7c0`

```text
$ pnpm check   → sin errores (incluye el typecheck de tests/integration)
$ pnpm test    → backend 12 files · 150 passed · frontend 6 files · 54 passed
$ pnpm build   → OK
```

**Pendiente en local (Docker):** `pnpm --filter backend test:integration` (INT-V11 cambiado, INT-V14 e INT-V15 nuevos). No se pudo ejecutar en el entorno de trabajo; la CI lo ejecuta en el PR.

## Criterio de aceptación (#61)

- [x] Idempotente: sesión ya cerrada → `already_processed`
- [x] Cierra `VideoSession` aunque la visita/incidencia ya esté completada
- [x] `serverRotation` no toca la visita
- [x] Sesión desconocida → 200 `ignored`
- [x] No duplica SMS
- [x] Tests de contrato + integración (integración pendiente de ejecutar)

## 26/11 · Orden del cierre

- La `VideoSession` pasa a `ENDED` al final (antes, al principio). Nuevo test unitario: fallo al guardar la incidencia → 500, sin SMS, sesión `ACTIVE`; el reintento devuelve `processed` y cierra todo.
- `pnpm check` ✅ · `pnpm --filter backend test` ✅ 151/151 · `test:integration` ⏳ en local

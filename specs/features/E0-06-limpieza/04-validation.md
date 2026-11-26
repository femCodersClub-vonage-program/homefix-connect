# E0-06 · Validación

> 25/11/2026 · rama `chore/E0-06-limpieza` sobre `main` @ `027c7c0`

```text
$ pnpm check   → sin errores
$ pnpm test    → backend 12 files · 141 passed · frontend 6 files · 54 passed
$ pnpm build   → OK
```

Bundle del frontend (`vite build`):

| | Antes | Después |
|---|---|---|
| Inicial (`index-*.js`) | 3.206 kB · **991 kB gzip** | 264 kB · **82 kB gzip** ✅ |
| `VideoCall-*.js` (SDK, solo al entrar en la llamada) | — | 2.934 kB · 906 kB gzip |

`grep -rn console. backend/src frontend/src` (sin tests) → 0 resultados.

Pendiente en local: `pnpm db:seed` (muestra la línea JSON `seed ok`) y entrar a una llamada para comprobar que el chunk del SDK se carga.

## Criterio de aceptación (#65)

- [x] 6 env sin uso eliminadas (y documentado por qué)
- [x] Seed con logger
- [x] `db:seed` vs `db:reset` documentado (LOCAL_SETUP §2 y §8, README)
- [x] SDK de Vonage fuera del bundle inicial (`import()` dinámico vía `React.lazy`)
- [x] Bundle inicial < 500 kB gzip (82 kB); el chunk del SDK, documentado

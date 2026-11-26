# E0-06 · Limpieza: env sin uso, console.log, seed y bundle — Requisitos

> Issue: #65 · Asignada a Caro-it (25/11) · Rama: `chore/E0-06-limpieza` · Depende de: ninguna
> Base: `docs/PROJECT_STATUS.md` §8 (puntos 10, 11, 12, 14 y 19) · `docs/MVP_EXTENDED.md` §6

## 1. Requisitos (issue #65)

| ID | Requisito | Detalle encontrado |
| -- | --------- | ------------------ |
| E-01 | Eliminar o documentar las 6 env sin uso | `VONAGE_API_KEY`, `VONAGE_API_SECRET`, `MANAGER_PHONE`, `TENANT_PHONE`, `TECHNICIAN_PHONE`, `WEBHOOK_BASE_URL`: solo aparecen en `env.ts` |
| E-02 | El seed usa el logger, no `console.log` | 5 `console.log` + 1 `console.error` en `seed.ts` (los únicos del backend/frontend fuera de tests) |
| E-03 | `pnpm db:seed` no promete reset; documentar `db:reset` | El seed hace `upsert` con `update: {}`: no restaura una demo ya usada |
| E-04 | SDK de Vonage en `import()` dinámico (code-split) | `@vonage/client-sdk-video` iba en el bundle inicial (3,2 MB · 991 kB gzip) |
| E-05 | Bundle < 500 kB gzip o documentar por qué no | — |

## 2. Decisiones (Carolina: «sigue con esas», 25/11)

1. **Env:** se quitan las 6 de `env.ts`. En `.env.example` y el README se quitan `VONAGE_API_KEY/SECRET` y `WEBHOOK_BASE_URL`, con un comentario de por qué. Los `*_PHONE` ya estaban documentados como «no se usan».
2. **Code-split** con `React.lazy` sobre `VideoCall` en `IncidentDetail`, **sin tocar `useVideoCall`**: Mary trabaja ese hook en E0-03 y así no hay conflicto.
3. **Bundle:** el inicial baja a 82 kB gzip. El chunk del SDK (906 kB gzip) es código de Vonage y no se puede reducir; se descarga solo al entrar en la llamada. Se mantiene el aviso de Vite (no se sube `chunkSizeWarningLimit`) para no ocultar otros chunks grandes.

## 3. Fuera de alcance

Hacer el seed «restaurativo»; tocar `useVideoCall`; documentación general (E0-07).

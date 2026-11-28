# E4-02 · Validación

| CA | Test | Estado |
|---|---|---|
| CA-1 | `post-visit.test.ts` E4-02 CA-1 · CA-5 de la B3 actualizado · `post-visit.int.test.ts` INT-E4-3 | ✅ unit · ⏳ int |
| CA-2 | `post-visit.test.ts` E4-02 CA-2 | ✅ |
| CA-3 | `post-visit.test.ts` E4-02 CA-3 (×2) | ✅ |
| CA-4 | `post-visit.test.ts` E4-02 CA-4 | ✅ |
| CA-5 | `post-visit.test.ts` E4-02 CA-5 | ✅ |
| CA-6 | `notification.repo.test.ts` (memoria) · `notification.repo.int.test.ts` INT-3, INT-E4-1, INT-E4-2 | ✅ unit · ⏳ int |
| CA-7 | `post-visit.int.test.ts` INT-E4-4 | ⏳ int |

Tests de la B3 que cambian de expectativa:

- **CA-2 «ya enviado»**: ahora la fila previa es de las dos destinatarias (antes bastaba una).
- **CA-2 «sin gestora»**: `skipped` = `[NO_MANAGER, ALREADY_SENT]` (Q2).
- **CA-5 «FAILED previa»**: la fila es de la inquilina → no se le reenvía, pero la gestora sí recibe el suyo.

## Resultados (26/11)

- `pnpm check` ✅
- `pnpm --filter backend test` ✅ 148/148
- `pnpm --filter backend test:integration` ⏳ pendiente de pasar en local con Docker (en la nube no hay Postgres ni motores de Prisma)

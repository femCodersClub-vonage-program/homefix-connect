# E1-04 · Validación

| CA | Test | Estado |
|---|---|---|
| CA-1 | `video-events.test.ts` E1-04 CA-1 · INT-E14-1 · CA-5 de A4 | ✅ unit · ⏳ int |
| CA-2 | E1-04 CA-2 | ✅ |
| CA-3 | INT-E14-2 · E0-02 «visita ya CANCELLED» | ✅ unit · ⏳ int |
| CA-4 | INT-E14-3 · E0-02 «visita ya COMPLETED» | ✅ unit · ⏳ int |
| CA-5 | Tests de E0-02 (unit + contrato) | ✅ |

## Resultados (26/11)

- Merge de `fix/E0-02-session-destroyed`: 2 conflictos de una línea en fixtures (`completedAt` de E1-01 + `visitStatus` de E0-02), resueltos juntando los dos.
- `pnpm check` ✅ · `pnpm --filter backend test` ✅ 183/183
- `test:integration` ⏳ en local con Docker

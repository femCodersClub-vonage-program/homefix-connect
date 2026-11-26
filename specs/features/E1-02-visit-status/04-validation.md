# E1-02 · Validación

| CA | Test | Estado |
|---|---|---|
| CA-1 | `visit-status.service.test.ts` CA-1 (×2) · contrato VC-1 · INT-VS1 | ✅ unit/contrato · ⏳ int |
| CA-2 | CA-2 · VC-2 · INT-VS2 | ✅ · ⏳ int |
| CA-3 | CA-3 (×2) · INT-VS3 | ✅ · ⏳ int |
| CA-4 | CA-4 · VC-3 | ✅ |
| CA-5 | CA-5 (×2) | ✅ |
| CA-6 | CA-6 · VC-5 | ✅ |
| CA-7 | CA-7 · VC-6 | ✅ |
| CA-8 | CA-8 · INT-VS5 | ✅ · ⏳ int |
| CA-9 | CA-9 (×2) · VC-7 · INT-VS4 | ✅ · ⏳ int |
| 400 / 500 | VC-4 (×4) · VC-8 | ✅ |

## Resultados (26/11)

- `pnpm check` ✅
- `pnpm --filter backend test` ✅ 172/172
- `pnpm --filter backend test:integration` ⏳ pendiente en local con Docker (en la nube no hay Postgres ni motores de Prisma)

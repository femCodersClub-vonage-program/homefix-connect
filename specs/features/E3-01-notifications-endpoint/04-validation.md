# E3-01 · Validación

| CA | Test | Estado |
|---|---|---|
| CA-1 | `notifications.contract.test.ts` NC-1 · INT-N1 | ✅ contrato · ⏳ int |
| CA-2 | NC-2 · INT-N1 | ✅ · ⏳ int |
| CA-3 | NC-3 (×3) | ✅ |
| CA-4 | NC-4 · INT-N2 | ✅ · ⏳ int |
| CA-5 | NC-5 (×2) | ✅ |
| CA-6 | NC-6 (×2) · INT-N3 | ✅ · ⏳ int |
| CA-7 | NC-7 | ✅ |
| CA-8 | NC-8 | ✅ |

## Resultados (26/11)

- `pnpm check` ✅ · `pnpm --filter backend test` ✅ 190/190
- `test:integration` ⏳ en local con Docker

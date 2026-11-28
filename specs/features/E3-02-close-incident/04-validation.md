# E3-02 · Validación

| CA | Test | Estado |
|---|---|---|
| CA-1 | `close-incident.service.test.ts` CA-1 · contrato CC-1 · INT-C1 | ✅ · ⏳ int |
| CA-2 | CA-2 · CC-2 · INT-C1 | ✅ · ⏳ int |
| CA-3 | CA-3 (×4) · CC-6 · INT-C2 | ✅ · ⏳ int |
| CA-4 | CA-4 (×5) · CC-4 | ✅ |
| CA-5 | CA-5 · CC-5 | ✅ |
| CA-6 | CA-6 (×2) | ✅ |
| CA-7 | INT-C3 | ⏳ int |
| 400 / 500 | CC-3 (×2) · CC-7 | ✅ |

## Resultados (26/11)

- `pnpm check` ✅ · `pnpm --filter backend test` ✅ 194/194
- `test:integration` ⏳ en local con Docker

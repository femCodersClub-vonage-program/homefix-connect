# E1-01 · Validación

> 25/11/2026 · rama `spec/E1-01-visit-lifecycle` sobre `main` @ `027c7c0`

## Comandos

```text
$ pnpm gen:types   → backend/openapi.yaml → frontend/src/api/generated/openapi.d.ts ✓
$ pnpm check       → sin errores (lint + typecheck en backend y frontend)
$ pnpm test        → backend 12 files · 141 passed · frontend 6 files · 54 passed
$ pnpm build       → backend y frontend compilan
```

`prisma validate` / `prisma generate`: el cliente se generó y los tipos nuevos (`completedAt`, `deliveredAt`) compilan en todo el backend.

## Pendiente de verificar en local (con Docker)

La integración con Postgres (`pnpm --filter backend test:integration`) no se pudo lanzar en el entorno de trabajo. Revisión manual: la base de tests se crea limpia y ningún test inserta dos `Notification` con la misma incidencia + plantilla + destinataria ni el mismo `providerMessageId`. La CI la ejecuta en el PR.

```text
pnpm db:reset                              # recrea la BD local con las uniques
pnpm --filter backend test:integration     # esperado: 21/21 en verde
```

## Criterio de aceptación (#67)

- [x] OpenAPI: `visit-status`, `close`, `notifications`, `message-status` (+ `video-events`, Q1)
- [x] Schema: `Visit.completedAt`, `Notification.deliveredAt`, `@@unique([incidentId, template, recipientId])`, unique de `providerMessageId`
- [x] `openapi.d.ts` regenerado en el mismo PR
- [ ] Revisión aprobada por otra persona (§2.9)

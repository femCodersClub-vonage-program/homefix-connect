# backend/AGENTS.md — Reglas de la capa backend

> **Deltas sobre [`AGENTS.md`](../AGENTS.md).** Si algo no está aquí,
> aplica la guía raíz. Este archivo no repite reglas globales.

---

## 1. Stack

Express 5 · TypeScript (ESM) · Prisma + PostgreSQL · `zod` · `pino` · Vitest +
Supertest · Vonage Server SDK.

## 2. Mapa de carpetas (estado actual)

```
backend/
├── prisma/schema.prisma      # modelo de datos v0 (cambios: PR aprobado)
├── src/
│   ├── index.ts              # arranque del servidor (:3000) + shutdown
│   ├── app.ts                # createApp(): middlewares, rutas, 404 y errores
│   ├── config/env.ts         # validación de entorno con zod
│   ├── lib/logger.ts         # pino → logs/app.jsonl
│   ├── db/
│   │   ├── client.ts         # instancia única de PrismaClient
│   │   └── seed.ts           # datos de demo (IDs fijos)
│   └── routes/               # un archivo por recurso
│       ├── health.ts         # GET /api/health
│       └── incidents.ts      # GET /api/incidents/:id  (provisional, ver T1)
└── logs/app.jsonl            # generado al ejecutar (ignorado por git)
```

Las carpetas `services/` y `webhooks/` **se crean con A1/A2 y A4**: no las
añadas vacías.

## 3. Reglas de capas

| Capa | Puede | No puede |
|---|---|---|
| `routes/` | Leer `req`, validar con `zod`, llamar a un service o a Prisma, devolver JSON | Contener lógica de negocio, llamar a Vonage directamente |
| `services/` (cuando exista) | Lógica de negocio pura, orquestación, llamadas a SDKs | Importar `express`, `req`/`res`, o saber de HTTP |
| `db/` | Prisma | Reglas de negocio |
| `lib/` | Utilidades transversales (logger, firmas, helpers) | Depender de `routes/` |

**Regla de oro:** un service debe poder testearse sin arrancar Express y sin
Postgres.

## 4. Cómo añadir un endpoint

1. Comprueba que el contrato ya lo define `openapi.yaml` (si no, es T1: no lo
   inventes en el código).
2. Valida la entrada con `zod` (body, params, query).
3. Implementa en `routes/<recurso>.ts`, o extrae a `services/` si hay lógica.
4. Devuelve el JSON del contrato y el status correcto:
   `400` entrada inválida · `403` rol no autorizado · `404` no existe ·
   `409` estado no válido · `500` error inesperado.
5. Errores: `res.status(x).json({ error: 'mensaje' })`. Para lo inesperado,
   lanza y deja que lo capture el `errorHandler` de `app.ts`.
6. Añade el test (Supertest sobre `createApp()`, mockeando Prisma o el SDK).

## 5. Prisma

- Usa **siempre** el singleton `src/db/client.ts`. Nunca `new PrismaClient()` en
  una ruta.
- `select` o `include` explícitos: no devuelvas la fila entera por comodidad.
- Nada de SQL crudo salvo justificación en el PR.
- **`schema.prisma` es v0 y provisional.** Se refina en el PR de la tarea que lo
  necesita, con revisión.
- **No se usan migraciones en las 4 semanas**: `pnpm db:push`. No crees
  `prisma/migrations/`.
- Si cambias el schema, actualiza `src/db/seed.ts` en el mismo PR y comprueba que
  `docker compose down -v && pnpm db:up && pnpm db:push && pnpm db:seed` funciona.

### IDs fijos del seed

`inc_demo`, `visit_demo`, `vs_demo`, `usr_tenant_demo`, `usr_technician_demo`,
`usr_manager_demo`. **No los cambies** sin actualizar el seed, los tests y el
frontend que los referencien.

## 6. Vonage

- Los SDKs de servidor viven **solo** en el backend. El frontend nunca ve el API
  secret.
- Las credenciales son opcionales en el arranque (`config/env.ts`) y se validan
  **en el punto de uso**: si falta una clave, el endpoint responde con un error
  claro, no revienta el proceso entero.
- **Nunca** loguees secretos, tokens ni cabeceras de autorización.
- Toda llamada a Vonage se hace detrás de un service testeable con mocks. En los
  tests **no** se llama a la API real.
- Los webhooks se validan por firma **antes** de procesar el payload
  (`X3` para HMAC).

## 7. Logging

- Usa `logger` de `src/lib/logger.ts`. Prohibido `console.log`.
- Logs estructurados: `logger.info({ incidentId, sessionId }, 'session ended')`.
- Un log por evento de negocio relevante (sesión creada, token emitido, SMS
  encolado, webhook recibido, error).
- No loguees datos personales más allá de IDs; los teléfonos, nunca completos.

## 8. Tests en esta capa

| Qué | Cómo |
|---|---|
| Ruta | Supertest contra `createApp()` |
| Service | Vitest puro, con dobles de Prisma y del SDK |
| Prisma | `vi.mock('../db/client.js', ...)`; **no** Postgres real en unitarios |
| Integración | Solo en `tests/integration/` (tarea B5) con BD levantada |

- Los tests viven en `src/**/*.test.ts` o en `tests/` según el tipo.
- El test no debe depender del orden de ejecución ni de datos previos.

## 9. Comandos de esta capa

```bash
pnpm --filter backend dev
pnpm --filter backend test
pnpm --filter backend typecheck
pnpm --filter backend build
pnpm db:push && pnpm db:seed
```

## 10. No hagas

- ❌ Añadir `express.Router()` en `app.ts` para todo: usa un archivo por recurso.
- ❌ Devolver `res.send()` con HTML o texto: siempre JSON.
- ❌ Meter lógica de negocio en un middleware.
- ❌ Añadir `cors({ origin: '*' })` en producción (en local ya está y es suficiente).
- ❌ Instalar un ORM alternativo, un framework de validación distinto o un
  cliente HTTP extra.

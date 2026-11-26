# E0-05 · Contrato y DI de `GET /api/incidents/:id` — Requisitos

> Issue: #64 · Asignada a Caro-it (25/11) · Rama: `fix/E0-05-incidents-contract` · Depende de: ninguna (soft: E3-02 necesita el 403 de la gestora)
> Base: `docs/MVP_EXTENDED.md` §6 (E0-05) y §7.2 · #38 (`specs/features/38-incidents-contract/`)

## 1. Requisitos

### Explícitos (issue #64)

| ID | Requisito |
| -- | --------- |
| E-01 | La ruta usa `IncidentRepo` inyectado (no Prisma directo) |
| E-02 | Exige `X-User-Id` + `X-User-Role` → **401** si faltan |
| E-03 | Valida pertenencia (inquilina / técnica / gestora) → **403** si no |
| E-04 | Contrato OpenAPI con 401/403 |
| E-05 | Contract tests de `GET /incidents/:id` y `GET /health` |

### Derivados

| ID | Requisito | Justificación |
| -- | --------- | ------------- |
| D-01 | La respuesta sigue siendo **solo** el schema `Incident` (sin teléfonos, emails, `tenant`, `manager`, `*Id`, fechas, `vonageSessionId`) | #38 |
| D-02 | El frontend ya envía las cabeceras (`frontend/src/api/incidents.ts` → `userHeaders`): no se rompe | Código actual |
| D-03 | `401` se añade a la lista de códigos de `AGENTS.md` §11 (y `backend/AGENTS.md` §4) | `MVP_EXTENDED.md` §7.2 |

## 2. Decisiones de clarificación acordadas (Carolina, 25/11)

1. Faltan cabeceras, `X-User-Id` vacío o rol que no existe → **401** (en `/video-tokens` siguen siendo 400; no se toca).
2. Orden: **401 → 404 → 403**, como en `/video-tokens`.
3. `IncidentRepo.findById` + un mapper (`toIncidentContract`) que deja solo los campos del contrato.
4. `visit.completedAt` **no** entra aquí (E1-02).

## 3. Fuera de alcance

Mensajes de error del frontend para 401/403; `completedAt`; cambios en `/video-tokens`.

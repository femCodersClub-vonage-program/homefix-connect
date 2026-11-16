# 01 — Requirements · X1 · Interfaces + stubs

> **Issue:** [#4](https://github.com/femCodersClub-vonage-program/homefix-connect/issues/4)
> **Rama:** `feat/X1-interfaces` · **Size:** S · **PR:** [#30](https://github.com/femCodersClub-vonage-program/homefix-connect/pull/30)
> **Estado:** implementado (análisis reconstruido para el framework SDD).

---

## 1. Resumen del Problema

Los carriles A (vídeo), B (mensajería) y C (frontend) necesitan contratos
estables para avanzar en paralelo sin depender de Vonage ni de PostgreSQL. Sin
interfaces ni stubs, cada tarea inventaría su propia forma de llamar a servicios
y repositorios, generando retrabajo al integrar.

**Valor:** desbloquear el desarrollo paralelo con contratos TypeScript y dobles en
memoria testeables.

---

## 2. Casos de Uso Afectados

| Consumidor | Interface que usa |
|---|---|
| A1 / A2 / A3 | `VideoService`, `IncidentRepo`, `VideoSessionRepo` |
| A4 | `VideoSessionRepo` (`findByVonageSessionId`, `update`) |
| B1 / B2 / B3 | `MessagingService` |
| C1 / C2 | Contratos indirectos (la API) |

---

## 3. Comportamiento Actual vs Esperado

- **Antes:** no existían `services/` ni `repositories/`; cada tarea habría
  definido sus propias firmas.
- **Después:** cuatro interfaces con stubs en memoria, testeables sin Express,
  sin Postgres y sin Vonage.

---

## 4. Fuera de Alcance

- Implementaciones reales (Vonage SDK, Prisma, Express).
- Rutas, controladores, middlewares y webhooks.
- Cambios en `openapi.yaml` o `schema.prisma`.
- Validación de estados de negocio (corresponde a A3/A4).
- Creación de `VideoSession` (las sesiones ya existen; ver §6).

---

## 5. Dependencias

- **Hard:** ninguna.
- **Soft:** T2 (tipos y enums de Prisma); T1 (nombres alineados con el contrato).

---

## 6. Decisiones de Clarificación

1. **Stubs en el mismo archivo** que su interface (criterio del issue).
2. **Cuarta interface `VideoSessionRepo`**: A1 guarda `vonageSessionId`, A3 pasa a
   `ACTIVE` y A4 busca por `vonageSessionId` y cierra. Se crea repo dedicado para
   no mezclar agregados con `IncidentRepo`.
3. **Sin `create`**: en el MVP la `VideoSession` existe desde la visita (seed en
   `PENDING`); A1 solo persiste el id de Vonage.
4. **`update` por campos definidos**: `undefined` no borra; `null` sí limpia.
5. **Tipos derivados de Prisma** (`IncidentWithRelations`, `VideoSessionWithVisit`)
   para no duplicar el modelo.

---

## 7. Trazabilidad

- Issue [#4](https://github.com/femCodersClub-vonage-program/homefix-connect/issues/4) y su comentario de actualización de alcance.
- `docs/TASKS.md` §5 (X1) y §6–§7 (consumidores).
- `backend/AGENTS.md` §2–§3 (mapa y capas).

# TASKS — Plan de Ejecución Homefix Connect (MVP · 4 semanas restantes)

> **Plazo**: el proyecto empezó hace 2 semanas; **quedan 4 semanas**.
> **Objetivo**: tener en local, lo antes posible, una **videollamada 1-a-1 con Vonage Video** y, al colgar, **2 SMS con Vonage Messages**. Backend-first; frontend mínimo.
>
> **Referencias**: [`MVP_DEFINITION.md`](./MVP_DEFINITION.md) · [`SDD_PLAN.md`](./SDD_PLAN.md) · [`AGENTS.md`](./AGENTS.md) · [`ARCHITECTURE.md`](./ARCHITECTURE.md) · [`LOCAL_SETUP.md`](./LOCAL_SETUP.md)

---

## 0. Estado actual (2026-11-10)

| Hecho | Dónde |
|---|---|
| **T0** monorepo, **T2** Prisma + Docker + seed, **X2** CI | PR #27 (`chore/foundation`) — CI verde |
| Guía de arranque `docs/LOCAL_SETUP.md` | PR #27 |
| **D-01** `AGENTS.md` (raíz + capas) y **D-02** `ARCHITECTURE.md` v0 | rama `docs/foundation-docs` |

**Siguiente fila de la cola**: `T1` (contrato OpenAPI), `X1` (interfaces + stubs),
`X3` (HMAC). Después, la fila 3 (`A1`, `A2`, `B1`, `C1`, `C2`, `C3`).

---

## 1. Qué está fijo y qué se refina

| Fijo (no se discute) | Se refina por quien toma la tarea |
|----------------------|-----------------------------------|
| Casos de uso y scope del MVP | Modelo de datos (tablas, campos, enums) |
| Local + Vonage Video + Messages | Contrato exacto de endpoints y payloads |
| Plazo: 4 semanas | Nombres, validaciones, estados, roles |
| Todo lleva test | Estrategia de mock/stub concreta |
| Separación backend/frontend | Estructura de carpetas y patrones |

**Los issues no fijan modelo ni payload.** Fijan el caso de uso y el criterio de aceptación; las decisiones técnicas las toma quien implementa y las anota en el issue.

---

## 2. Principios

1. **Camino crítico corto**: primero lo que desbloquea (base + contrato + schema + interfaces).
2. **Tareas pequeñas**: ≤ 1 día, 1 PR, 1 responsabilidad, con tests. Tamaños solo `XS/S/M` (nunca `L/XL`).
3. **Pocos bloqueos**: solo 4 *enablers* son dependencia dura. El resto usa **stubs/mocks** y no se bloquea.
4. **Backend-first**: el grueso del esfuerzo va al backend y a las APIs de Vonage.
5. **Docs que desbloquean, temprano; docs que describen, después.**

---

## 3. Definición de "lista para tomar" (cada quien la refina)

Antes de escribir código, quien toma el issue completa en el propio issue:

```markdown
## Caso de uso (fijo)
<de MVP_DEFINITION.md>

## Criterio de aceptación (fijo, conductual)
- [ ] <resultado observable>

## A refinar por quien toma la tarea (antes de empezar)
- [ ] Forma del payload / campos necesarios
- [ ] Estados / enums / nombres
- [ ] Decisiones anotadas como comentario en el issue
- [ ] Actualizar contrato/schema en el mismo PR

## Dependencias
- Hard: <o "ninguna">
- Soft (mock hasta que exista): <tarea>
```

> Si al refinar la tarea crece > 1 día → se **parte en dos issues** antes de empezar.

---

## 4. Timeline (4 semanas restantes)

```
Semana 1: Enablers (T0, T1, T2, X1, X2, X3) + arrancar A1/A2/B1/C1
Semana 2: Backend video + messaging + pantallas frontend
Semana 3: Integración I1 (ngrok, vídeo real, SMS real) + tests
Semana 4: Buffer, fixes, edge cases, demo, AGENTS/ARCHITECTURE
```

---

## 5. Oleada 0 — Enablers (semana 1, en paralelo)

Solo estas son **dependencia dura**. Todas pequeñas.

| ID | Tarea | Size | Labels | Milestone | Blocked by |
|----|-------|------|--------|-----------|------------|
| **T0** | Monorepo scaffold (workspaces + scripts + `.env.example`) | M | fase-0 | Fase 0 · Base | — |
| **T1** | Contrato OpenAPI (schemas + paths + `gen:types`) | M | fase-0, spec | Fase 0 · Base | — |
| **T2** | Prisma schema + `docker-compose` Postgres + seed | M | fase-0, spec | Fase 0 · Base | — |
| **X1** | Interfaces + stubs (`VideoService`, `MessagingService`, `IncidentRepo`) | S | fase-0 | Fase 0 · Base | — |
| **X2** | CI (lint + typecheck + test + build) | S | fase-0 | Fase 0 · Base | T0 (soft) |
| **X3** | Middleware verificación HMAC | S | fase-0 | Fase 0 · Base | — |

## 6. Oleada 1 — Backend (semana 1-2, paralelo)

| ID | Tarea | Size | Labels | Blocked by |
|----|-------|------|--------|------------|
| **A1** | `VideoService.createSession` (Vonage Video) | S | fase-1, backend-video | T1, T2 |
| **A2** | `VideoService.generateToken` (Vonage Video) | S | fase-1, backend-video | T1, T2 |
| **A3** | `POST /video-tokens` (validaciones 403/409) | S | fase-1, backend-video | A2 |
| **A4** | `POST /webhooks/video-events` (`session.end`) | S | fase-1, backend-video | A1, X1, X3 |
| **A5** | Tests video (unit + contract) | S | fase-1, backend-video, test | A3, A4 |
| **B1** | Cliente Vonage Messages (wrapper) | S | fase-1, backend-messaging | T1, T2 |
| **B2** | `MessagingService.sendSms` + plantilla post-visita | S | fase-1, backend-messaging | B1 |
| **B3** | `sendPostVisit` + registros `Notification` | S | fase-1, backend-messaging | B2, X1 |
| **B4** | `POST /webhooks/message-status` | S | fase-1, backend-messaging | B2 |
| **B5** | Tests messaging (unit + contract + integration) | S | fase-1, backend-messaging, test | B3, B4 |

## 7. Oleada 2 — Frontend (semana 1-2, con mocks)

| ID | Tarea | Size | Labels | Blocked by |
|----|-------|------|--------|------------|
| **C1** | Cliente API generado desde OpenAPI | XS | fase-1, frontend | T1 |
| **C2** | Pantalla `IncidentDetail` (datos + botón) | S | fase-1, frontend | C1 (mock data) |
| **C3** | `VideoCall`: init SDK + vídeo local + cleanup | M | fase-1, frontend | C1 (token fixture) |
| **C4** | `VideoCall`: vídeo remoto + eventos | S | fase-1, frontend | C3 |
| **C5** | Toast "Visita finalizada" | XS | fase-1, frontend | C1 (mock) |
| **C6** | Tests frontend | S | fase-1, frontend, test | C2, C3, C4, C5 |

## 8. Oleada 3 — Integración (semana 3-4)

| ID | Tarea | Size | Labels | Blocked by |
|----|-------|------|--------|------------|
| **I1** | E2E local con ngrok (vídeo real + SMS real) | M | fase-2, integration | A5, B5, C6 |
| **I2** | Edge cases + demo (best effort) | S | fase-2, integration | I1 |

## 9. Carril D — Documentación (paralelo, no bloquea)

| ID | Tarea | Size | Labels | Cuándo |
|----|-------|------|--------|--------|
| **D-01** | `docs/AGENTS.md` (commits, ramas, testing, constraints IA, entorno) | S | docs | Semana 1 |
| **D-02** | `docs/ARCHITECTURE.md` v0 (ADR-lite + 1 diagrama) | S | docs | Semana 1 |

> `D-06` / `D-07` (docs por workspace) quedan **fuera** del plazo; se abordan solo si sobra tiempo en la semana 4. Los `AGENTS.md` finos de `backend/` y `frontend/` ya existen (deltas de capa, no manuales completos).

---

## 10. Política de dependencias y cola de toma

| Tipo | Significado | Acción |
|------|-------------|--------|
| **Hard** | Sin esto no se empieza (T0, T1, T2, X1) | Va primero |
| **Soft (mock/stub)** | Se avanza con mock | **No bloquea** |
| **Integration** | Requiere piezas verdes | Al final |

**Cola de toma** (de arriba abajo; así se liberan las siguientes):

```
1. T0, T1, T2, X1, X2, X3            (enablers, cualquier orden entre sí)
        ▼
2. A1, A2, B1, C1, C2, C3            (primeros tomables)
        ▼
3. A3, A4, B2, B3, B4, C4, C5
        ▼
4. A5, B5, C6                        (tests de cierre de carril)
        ▼
5. I1 → I2
        │
        └─ D-01, D-02 en cualquier hueco
```

- Se toma primero lo de la fila superior; si una tarea depende de una de la fila anterior, se toma esa primero.
- Los tres carriles (A, B, C) **no se bloquean entre sí** gracias a X1 (interfaces/stubs) y al cliente tipado.

---

## 11. Acuerdos de trabajo

### Ramas
```
main (protegida)
 ├── chore/T0-monorepo
 ├── spec/T1-openapi
 ├── feat/A3-video-tokens
 ├── test/B5-messaging
 └── docs/D-01-agents
```

### Commits (Conventional Commits)
```
feat(video): generate Vonage token endpoint
fix(webhooks): validate HMAC signature
spec(api): add VideoTokenResponse schema
test(contract): add GET /incidents/:id
docs(agents): add commit and branch conventions
chore(monorepo): init pnpm workspaces
```

### Pull Requests
- 1 tarea = 1 rama = 1 PR
- Requiere **CI verde + 1 approval**
- Merge: **squash** a `main`

### Frontera backend ↔ frontend
- **`backend/openapi.yaml` es la frontera.** Si cambia, se avisa en el sync.
- El frontend usa **solo** tipos generados (`pnpm gen:types`).

### Sync
- **2×/semana, máx 30 min**: qué hice / qué haré / blockers + aprobar PRs.
- Todo lo demás: async (Slack / PR reviews / issues).

---

## 12. Definición de "Done" por tarea

- [ ] Caso de uso cumplido y criterio de aceptación marcado
- [ ] Decisiones de refinamiento anotadas en el issue
- [ ] Tests (unit / contract / integration) pasan
- [ ] `pnpm check` sin errores (lint + typecheck)
- [ ] Demo local del slice funcionando
- [ ] Contrato/schema actualizado en el mismo PR (si aplica)
- [ ] CI verde + 1 approval → squash merge

---

## 13. Ruta mínima a la demo local

```
T0 + T1 + T2 + X1 + X3  (semana 1)
      │
      ├─ A1 → A2 → A3 → A4 → A5   (video backend)
      ├─ B1 → B2 → B3 → B4 → B5   (SMS backend)
      └─ C1 → C2 → C3 → C4 → C5 → C6 (frontend)
      │
      ▼
I1 (integración real con ngrok) → DEMO
```

**Resultado**: dos pestañas (inquilina + técnico) entran a la videollamada 1-a-1; al colgar, `session.end` dispara 2 SMS reales y el frontend muestra "Visita finalizada".

---

## 14. GitHub Project #2

- **Project**: `HomeFix Connect` (org `femCodersClub-vonage-program`, #2)
- **Status**: Backlog → Ready → In progress → In review → Done
- **Milestones**: `Fase 0 · Base`, `Fase 1 · Implementación`, `Fase 2 · Integración`, `Documentación`
- **Labels de carril**: `fase-0`, `fase-1`, `fase-2`, `backend-video`, `backend-messaging`, `frontend`, `spec`, `test`, `integration`, `docs`
- **Assignees**: **sin asignar** (cada quien toma de la cola)

---

## 15. Checklist de arranque

- [ ] Issues creados en Project #2 (sin asignar)
- [ ] Arrancar T0, T1, T2, X1, X3 en paralelo
- [ ] Arrancar D-01 y D-02 en paralelo
- [ ] Verificar cuentas Vonage (Video app + Messages + números de prueba)
- [ ] Confirmar `pnpm dev` local

# TASKS — Plan de Ejecución Homefix Connect (MVP · 4 semanas restantes)

> **Plazo**: el proyecto empezó hace 2 semanas; **quedan 4 semanas**.
> **Objetivo**: tener en local, lo antes posible, una **videollamada 1-a-1 con Vonage Video** y, al colgar, **2 SMS con Vonage Messages**. Backend-first; frontend mínimo.
>
> **Referencias**: [`MVP_DEFINITION.md`](./MVP_DEFINITION.md) · [`SDD_PLAN.md`](./SDD_PLAN.md) · [`SDD_FRAMEWORK.md`](./SDD_FRAMEWORK.md) · [`AGENTS.md`](../AGENTS.md) · [`ARCHITECTURE.md`](./ARCHITECTURE.md) · [`LOCAL_SETUP.md`](./LOCAL_SETUP.md)

---

## 0. Estado actual (2026-11-16)

| Hecho | Dónde |
|---|---|
| **T0** monorepo, **T2** Prisma + Docker + seed, **X2** CI | PR #27 (`chore/foundation`) — CI verde |
| **T1** contrato OpenAPI, **X1** interfaces + stubs, **X3** firma JWT de webhooks | PR #31, #30, #32 |
| Decisiones de alcance (sesión lazy, `message.status` post-MVP, C1 con `openapi-typescript`) | PR #34 |
| **C2** pantalla de detalle de incidencia | PR #33 (revisada, pendiente de merge) |
| **D-01** `AGENTS.md` (raíz + capas) y **D-02** `ARCHITECTURE.md` v0 | rama `docs/foundation-docs` |

**Siguiente fila de la cola**: `A2` (`VideoService` real), `B1` y `C1`.
**A1 no existe como tarea**: se absorbió en A2 (ver §6).

---

## 1. Qué está fijo y qué se refina

| Fijo (no se discute) | Se refina por quien toma la tarea |
|----------------------|-----------------------------------|
| Casos de uso y scope del MVP | Modelo de datos (tablas, campos, enums) |
| Local + Vonage Video + Messages | Contrato exacto de endpoints y payloads |
| Plazo: 4 semanas | Nombres, validaciones, estados, roles |
| Todo lleva test | Estrategia de mock/stub concreta |
| Separación backend/frontend | Estructura de carpetas y patrones |

**Los issues no fijan modelo ni payload.** Fijan el caso de uso y el criterio de aceptación; las decisiones técnicas las toma quien implementa y las anota en el issue siguiendo el flujo SDD ([`docs/SDD_FRAMEWORK.md`](./SDD_FRAMEWORK.md)).

---

## 2. Principios

1. **Camino crítico corto**: primero lo que desbloquea (base + contrato + schema + interfaces).
2. **Tareas pequeñas**: ≤ 1 día, 1 PR, 1 responsabilidad, con tests. Tamaños solo `XS/S/M` (nunca `L/XL`).
3. **Pocos bloqueos**: solo 4 *enablers* son dependencia dura. El resto usa **stubs/mocks** y no se bloquea.
4. **Backend-first**: el grueso del esfuerzo va al backend y a las APIs de Vonage.
5. **Docs que desbloquean, temprano; docs que describen, después.**

---

## 3. Definición de "lista para tomar" (Refinamiento y Plantilla)

Antes de escribir código, quien toma el issue completa la plantilla oficial del repositorio en [`.github/ISSUE_TEMPLATE/tarea.md`](../.github/ISSUE_TEMPLATE/tarea.md) (gestionada automáticamente con la skill `sdd-05-issue-template-manager`).

Los aspectos indispensables a refinar antes de codificar son:
1. **Caso de uso fijo**: Extraído de [`MVP_DEFINITION.md`](./MVP_DEFINITION.md).
2. **Criterio de aceptación observable**: Qué debe pasar exactamente para dar por buena la tarea.
3. **Especificación mínima (datos mínimos)**: Solo los campos indispensables para cumplir el criterio de aceptación (sin campos "por si acaso").
4. **Payload y Contrato**: Formatos y tipos acordados (actualizando `openapi.yaml` / `schema.prisma` en el mismo PR si aplica).
5. **Dependencias**: Hard (bloqueantes) y Soft (mockeadas).

> Si al refinar la tarea crece > 1 día → se **parte en dos issues** antes de empezar.
>
> Regla completa de especificación incompleta y datos mínimos: [`AGENTS.md`](../AGENTS.md) §5.1 y [`docs/SDD_FRAMEWORK.md`](./SDD_FRAMEWORK.md).


---

## 4. Timeline (4 semanas restantes)

```
Semana 1: Enablers (T0, T1, T2, X1, X2, X3) + arrancar A2/B1/C1
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
| **T1** | Contrato OpenAPI (schemas + paths) | M | fase-0, spec | Fase 0 · Base | — |
| **T2** | Prisma schema + `docker-compose` Postgres + seed | M | fase-0, spec | Fase 0 · Base | — |
| **X1** | Interfaces + stubs (`VideoService`, `MessagingService`, `IncidentRepo`, `VideoSessionRepo`) | S | fase-0 | Fase 0 · Base | — |
| **X2** | CI (lint + typecheck + test + build) | S | fase-0 | Fase 0 · Base | T0 (soft) |
| **X3** | Middleware verificación firma JWT (HS256) | S | fase-0 | Fase 0 · Base | — |

## 6. Oleada 1 — Backend (semana 1-2, paralelo)

| ID | Tarea | Size | Labels | Blocked by |
|----|-------|------|--------|------------|
| **A2** | `VideoService` real: `createSession` + `generateToken` (Vonage Video) | S | fase-1, backend-video | T1, T2 |
| **A3** | `POST /video-tokens` (validaciones 403/409; crea la sesión si no tiene id) | S | fase-1, backend-video | A2 |
| **A4** | `POST /webhooks/video-events` (`session.end`; 400 si el id no existe, idempotente, 2 SMS una sola vez) | S | fase-1, backend-video | A2, X1, X3 |
| **A5** | Tests video (unit + contract) | S | fase-1, backend-video, test | A3, A4 |
| **B1** | Cliente Vonage Messages (wrapper) | S | fase-1, backend-messaging | T1, T2 |
| **B2** | `MessagingService.sendSms` + plantilla post-visita | S | fase-1, backend-messaging | B1 |
| **B3** | `sendPostVisit` + registros `Notification` | S | fase-1, backend-messaging | B2, X1 |
| **B4** | *(post-MVP)* `POST /webhooks/message-status` | S | post-mvp, backend-messaging | B2 |
| **B5** | Tests messaging (unit + contract) | S | fase-1, backend-messaging, test | B3 |

> **A1 está absorbida por A2.** No hay tarea «A1» ni issue abierto: `createSession`
> se implementa en el mismo PR que `generateToken`. Si un documento antiguo
> menciona A1, se resuelve en **A2**.

## 7. Oleada 2 — Frontend (semana 1-2, con mocks)

| ID | Tarea | Size | Labels | Blocked by |
|----|-------|------|--------|------------|
| **C1** | Cliente API generado desde OpenAPI (`openapi-typescript` + ADR; salida commiteada) | XS | fase-1, frontend | T1 |
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
| **D-01** | `AGENTS.md` (commits, ramas, testing, constraints IA, entorno) | S | docs | Semana 1 |
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
2. A2, B1, C1, C2, C3               (primeros tomables)
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
fix(webhooks): validate JWT signature
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

### Decisiones de alcance (MVP simple)

Decisiones tomadas en el refinamiento y que aplican a las tareas siguientes:

- **A1 absorbida por A2**: el `VideoService` real (`createSession` +
  `generateToken`) es **una sola tarea y un solo PR**. El issue #7 (A1) se cerró
  como «no planeado» y todo su alcance vive en el issue #8 (A2).
- **Firma de webhooks Vonage**: JWT **HS256** con `payload_hash` del cuerpo
  original (X3). No es un HMAC plano; no se acepta ningún otro algoritmo.
- **Replay fuera de alcance**: no se validan `iat`/`exp`/`jti`. A cambio, **A4
  debe ser idempotente**: un `session.end` repetido no reenvía los SMS.
- **Sesión de vídeo**: se crea en el **primer acceso** a `POST /video-tokens`
  (A2/A3) y se persiste en `VideoSession.vonageSessionId`. No hay paso manual en
  el panel de Vonage ni id precreado en el seed. A3 añade un guard para que dos
  peticiones simultáneas no creen dos sesiones.
- **Entrega de SMS (post-MVP)**: el webhook `message.status` no entra en el MVP;
  las `Notification` se quedan en `QUEUED`. El enum `NotificationStatus` se
  mantiene por si se retoma.
- **`gen:types`**: se implementa en C1 con `openapi-typescript` y la salida se
  commitea (nadie necesita generarla para arrancar). Al ser una dependencia
  nueva, C1 incluye su ADR en `docs/ARCHITECTURE.md`.
- **Clave privada de Vonage**: `VONAGE_PRIVATE_KEY_PATH` en local (el archivo
  está en `.gitignore`); en producción se inyecta como secreto, nunca en el
  repo. La clave **nunca** sale del backend.

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
      ├─ A2 → A3 → A4 → A5        (video backend)
      ├─ B1 → B2 → B3 → B5        (SMS backend; B4 es post-MVP)
      └─ C1 → C2 → C3 → C4 → C5 → C6 (frontend)
      │
      ▼
I1 (integración real con ngrok) → DEMO
```

**Resultado**: dos pestañas (inquilina + técnica) entran a la videollamada 1-a-1; al colgar, `session.end` dispara 2 SMS reales y el frontend muestra "Visita finalizada".

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

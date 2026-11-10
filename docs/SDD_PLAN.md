# SDD Plan — Homefix Connect (MVP)

> **Specification-Driven Development**: Definimos contratos, modelos y arquitectura **antes** de codificar. Cada spec es fuente de verdad y genera tests + implementación.
>
> **Equipo**: 4 personas (1 mentora + 3 desarrolladoras) — todas tocan todo, rotación semanal.
>
> **Plazo**: proyecto de 6 semanas iniciado hace 2 → **quedan 4 semanas**. El desglose vivo de tareas está en [`TASKS.md`](./TASKS.md).

---

## 1. Metodología SDD en este Proyecto

```
┌─────────────────────────────────────────────────────────────────┐
│  FASE DE DEFINICIÓN (Semana 1, días 1-2) — "Specs First"        │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ EL EQUIPO (3 desarrolladoras) DEFINE ESTOS ARTEFACTOS:    │  │
│  │  Mentora guía, revisa y aprueba — NO los escribe ella.   │  │
│  │  1. AGENTS.md          → Guía de trabajo, flujo, comandos,│  │
│  │                           constraints IA, testing, Docker  │  │
│  │  2. ARCHITECTURE.md v0 → Decisiones (ADR-lite) + 1 diagrama│  │
│  │  3. openapi.yaml       → Contrato API (T1)                 │  │
│  │  4. schema.prisma      → Modelo de datos (T2)              │  │
│  │  5. TASKS.md           → Breakdown ya definido (este repo)  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                          ↓                                      │
│  FASE DE IMPLEMENTACIÓN (Semanas 1-4) — "Tests First"          │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Para cada tarea pequeña (spec ya refinada):               │  │
│  │  • Refinar el issue (payload/estados) antes de codear     │  │
│  │  • Spec → genera types (`pnpm gen:types`)                 │  │
│  │  • Test de contrato/unitario (rojo) — OBLIGATORIO        │  │
│  │  • Implementación backend + frontend (verde)              │  │
│  │  • `pnpm check` (lint + typecheck)                        │  │
│  │  • Demo local del slice                                   │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**Regla de oro**: *No hay código sin spec. No hay merge sin tests verdes. Las specs las escribe el equipo, no la mentora.*

---

## 2. Constraints y Reglas para IA (Copilot / Asistentes)

| Qué **NO** debe hacer la IA | Qué **SÍ** puede hacer |
|----------------------------|------------------------|
| ❌ Escribir specs (OpenAPI, Prisma, AGENTS, ARCHITECTURE, TASKS) | ✅ Generar código a partir de specs ya aprobadas |
| ❌ Decidir arquitectura, stack, patrones | ✅ Sugerir implementación dado un contrato |
| ❌ Crear tests de contrato / E2E desde cero | ✅ Escribir tests unitarios dado un service/hook |
| ❌ Modificar `openapi.yaml` o `schema.prisma` sin PR aprobado | ✅ Refactor código existente respetando tipos |
| ❌ Inventar endpoints, campos, flujos no definidos | ✅ Explicar código, documentar, generar boilerplate |
| ❌ Saltarse `pnpm check` / `pnpm test` | ✅ Ejecutar comandos, debuggear errores de build |

**Enforcement**: CI rechaza PRs donde `openapi.yaml` / `schema.prisma` cambian sin label `spec-change` + approval de mentora.

---

## 3. Testing — Obligatorio en Todo

| Nivel | Herramienta | Qué Cubre | Cuándo |
|-------|-------------|-----------|--------|
| **Contrato** | Pact | OpenAPI endpoints + webhooks Vonage | Antes de implementar (rojo) |
| **Unitario** | Vitest | Services, utils, hooks, components | Junto a implementación |
| **Integración** | Supertest + Testcontainers | Rutas Express + Prisma + Vonage mocks | Antes de merge |
| **E2E** | Playwright | Flujo completo: 2 browsers (tenant + tech) → join → hangup → SMS | Semana 3-4, para la demo |

**Cobertura mínima**: `lines > 80%`, `branches > 70%`, `functions > 80%` en CI.

---

## 4. Docker — Evaluación

| Uso | Decisión | Por qué |
|-----|----------|---------|
| **Base de datos local** | ✅ `docker-compose.yml` solo Postgres (+ opcional pgAdmin) | Fácil `pnpm db:push`, mismo entorno que prod |
| **Backend en contenedor** | ❌ No en MVP | Demo en local con `tsx watch` — más rápido para desarrollo |
| **Frontend en contenedor** | ❌ No en MVP | `vite` HMR nativo — contenedor añade complejidad innecesaria |
| **Demo final** | 🟡 Solo `docker-compose up db` + `pnpm dev` en host | Reproducible, sin overhead |

**Archivo a crear**: `docker-compose.yml` (solo Postgres) — lo define el equipo en `TASKS.md` / `ARCHITECTURE.md`.

---

## 5. Observabilidad — Solo Logging a Archivo

| Señal | Implementación MVP |
|-------|-------------------|
| **Logs** | `pino` → archivo `logs/app-<fecha>.jsonl` (rotación diaria) + pretty en consola dev |
| **Niveles** | `info` (eventos clave), `warn` (reintentos), `error` (fallos) |
| **Campos obligatorios** | `timestamp`, `level`, `event`, `correlationId`, `userId?`, `incidentId?`, `durationMs?` |
| **NO en MVP** | OpenTelemetry, Jaeger, Prometheus, Grafana, métricas custom, alertas |

**Ejemplo log**:
```json
{"timestamp":"2026-11-03T15:30:00.123Z","level":30,"event":"video_token_generated","correlationId":"req-abc","userId":"tenant-1","incidentId":"inc-1","role":"TENANT","durationMs":45}
```

---

## 6. Flujo de Trabajo Diario (Ejemplo — El Equipo lo Define en AGENTS.md)

> **Nota**: Esto es **ejemplo**. El flujo definitivo lo escribe el equipo en `AGENTS.md` (tarea D-01).

```bash
# 1. Levantar entorno local
pnpm dev          # backend:3000 + frontend:5173 (concurrently)
ngrok http 3000   # actualizar WEBHOOK_BASE_URL en backend/.env
docker-compose up -d postgres  # si no está arriba

# 2. Cambiar spec (ej. añadir campo en openapi.yaml / schema.prisma)
#    → pnpm gen:types
#    → verifica que frontend compila (pnpm check)

# 3. Escribir test (rojo) — OBLIGATORIO
pnpm test:contract   # Pact para endpoints/webhooks
pnpm test:unit       # Vitest para service/hook nuevo

# 4. Implementar (verde)
#    backend: routes → services → webhooks (siguiendo ARCHITECTURE.md)
#    frontend: hooks → components → pages (usando types generados)

# 5. Verificar localmente
pnpm check           # lint + typecheck (debe pasar)
pnpm test            # unit + contract (debe pasar)
# Test manual en navegador: flujo completo con 2 pestañas

# 6. PR + CI
#    GitHub Actions: lint + typecheck + test + build
#    Requiere: 1 approval + CI verde + label correcta
#    Merge: squash a main
```

---

## 7. Tareas de Definición (Semana 1) — Las Define el Equipo (3 Desarrolladoras)

El desglose completo y vivo está en [`TASKS.md`](./TASKS.md). En definición quedan **2 documentos** + **2 specs técnicas** (que ya son tareas de implementación en `TASKS.md`):

| ID | Artefacto | Owner | Qué Define | Criterios de Aceptación |
|----|-----------|-------|------------|-------------------------|
| **D-01** | `docs/AGENTS.md` (raíz) | Dev 1 | Flujo global, commits, branching, testing, Docker, constraints IA, troubleshooting, Vonage refs | Nueva persona onboardea en < 30 min; CI respeta constraints IA |
| **D-02** | `docs/ARCHITECTURE.md` v0 | Dev 2 | ADR-lite (decisiones), 1 diagrama de contenedores, seguridad, observabilidad (logging a archivo), Docker | Decisiones trazables; diagrama renderiza en GitHub |
| **T1** | `backend/openapi.yaml` | Dev 2 | Contrato API (schemas + paths + `gen:types`) | `pnpm gen:types` sin errores |
| **T2** | `backend/prisma/schema.prisma` + `docker-compose.yml` | Dev 3 | Modelo de datos, DB local, seed | `docker-compose up -d` + `db:push` + `db:seed` OK |

> **Nota**: `D-03`/`D-04`/`D-05` del plan anterior se absorbieron en `T2`/`T1`/`TASKS.md`. `D-06`/`D-07` (docs por workspace) quedan **fuera del plazo**.

**Rol de la mentora**: Revisa PRs, pregunta, desafía, aprueba — **NO escribe los documentos**.

**Entregable Semana 1**: `T1` + `T2` verdes (`gen:types`, `db:push`, `db:seed`) + `D-01`/`D-02` aprobados.

---

## 8. Tareas de Implementación (Semanas 1-4) — Por Oleadas

| Semana | Foco | Tareas Clave | Tests Requeridos |
|--------|------|--------------|------------------|
| **1** | **Enablers** | `T0` monorepo, `T1` contrato, `T2` modelo+DB, `X1` interfaces/stubs, `X2` CI, `X3` HMAC | `gen:types`, `db:push`, `db:seed`, CI verde |
| **2** | **Backend + pantallas** | `A1-A5` video, `B1-B5` SMS, `C1-C6` frontend | Unit + contract por service/endpoint |
| **3** | **Integración** | `I1` E2E local con ngrok (vídeo real + SMS real) | Contract webhooks + integration + E2E 2 browsers |
| **4** | **Cierre** | `I2` edge cases (best effort), demo, `D-01`/`D-02` | E2E completo + demo local |

> Detalle de cada tarea, tamaños y dependencias: [`TASKS.md`](./TASKS.md).

---

## 9. Stack Tecnológico (Fijado — El Equipo lo Documenta en ARCHITECTURE.md)

| Capa | Tecnología |
|------|------------|
| **Monorepo** | pnpm workspaces |
| **Backend** | Node.js + TypeScript + Express + Prisma ORM |
| **Frontend** | React + TypeScript + Vite + TanStack Query |
| **DB** | PostgreSQL (docker-compose local) / Neon (staging futuro) |
| **Video** | Vonage Video API (Server SDK + Web SDK) |
| **Mensajería** | Vonage Messages API (Server SDK) |
| **Testing** | Vitest (unit), Pact (contract), Playwright (e2e), Supertest (integration) |
| **CI/CD** | GitHub Actions (lint, typecheck, test, build) |
| **Webhooks Local** | ngrok |
| **Observabilidad** | `pino` → archivo JSONL (rotación diaria) |
| **Contenedores** | `docker-compose.yml` solo Postgres |

---

## 10. Definición de "Done" por Tarea

- [ ] Spec actualizada (`openapi.yaml` / `schema.prisma` / `AGENTS.md` / etc.)
- [ ] Tests de contrato/unitarios/integración pasan (`pnpm test`)
- [ ] `pnpm check` sin errores (lint + typecheck)
- [ ] Demo local funcionando (flujo manual verificado)
- [ ] Docs sincronizadas si cambió arquitectura/contrato
- [ ] Logging a archivo verificado para eventos clave
- [ ] 1 approval + CI verde → squash merge a `main`

---

## 11. Rotación Semanal (Sugerida — 3 Devs)

| Semana | Dev 1 | Dev 2 | Dev 3 | Mentora |
|--------|-------|-------|-------|---------|
| 1 | T0 monorepo + A1/A2 | T1 contrato + D-01 | T2 modelo+DB + D-02 | Revisa PRs, aprueba |
| 2 | A3/A4/A5 video | B1-B5 mensajería | C1-C6 frontend | Video SDK, unblocks |
| 3 | Integración I1 (backend) | Integración I1 (SMS) | Integración I1 (frontend) | Revisión integración |
| 4 | Edge cases I2 | Fixes + docs | Demo + tests finales | Demo final, cierre |

> Todas tocan backend + frontend + testing. "Heavy" = lleva la iniciativa en ese slice.

---

## 12. GitHub Project #2 — Columns

```
Backlog → Ready → In progress → In review → Done
```

- **Backlog**: issues creados, aún no refinados
- **Ready**: refinado por quien lo toma + dependencias resueltas o mockeadas
- **In progress**: rama abierta
- **In review**: PR con CI verde
- **Done**: merged + demo local verificada

> Milestones: `Fase 0 · Base`, `Fase 1 · Implementación`, `Fase 2 · Integración`, `Documentación`.

---

## 13. Riesgos y Mitigación (Identificados en Definición)

| Riesgo | Mitigación (se decide en D-01/D-02/D-04) |
|--------|------------------------------------------|
| Vonage Video SDK breaking changes | Lock version en `package.json`, tests E2E semanales |
| Webhooks no llegan en local (ngrok) | Documentar troubleshooting en `AGENTS.md`, fallback cron job en `TASKS.md` |
| SMS no llegan (cuenta trial) | Usar números verificados en Dashboard, testear en Semana 1 |
| WebRTC firewalls/NAT | Configurar STUN/TURN en `ARCHITECTURE.md`, probar en redes distintas |
| Scope creep | MVP congelado en `MVP_DEFINITION.md`, nuevas ideas → backlog fase 2 |
| IA genera specs/código no aprobado | Constraints en `AGENTS.md` + CI bloquea cambios en `openapi.yaml`/`schema.prisma` sin label |

---

## 14. Documentación por Workspace (Backend / Frontend)

> Además de los docs cross-cutting en `docs/`, cada workspace tiene su **guía interna** para patrones locales, onboarding y contexto de IA.

```
homefix-connect/
├── docs/                          ← Cross-cutting (equipo completo)
│   ├── MVP_DEFINITION.md
│   ├── SDD_PLAN.md
│   ├── ARCHITECTURE.md
│   ├── API_CONTRACTS.md
│   ├── DATA_MODEL.md
│   └── TASKS.md
├── backend/
│   ├── docs/                      ← Backend-specific (Definen en D-06)
│   │   ├── AGENTS.md              ← Patrones: services, middleware, Prisma, Vonage SDK, logging, testing
│   │   ├── SERVICES.md            ← VideoService, MessagingService, IncidentService...
│   │   ├── WEBHOOKS.md            ← HMAC, reintentos, idempotencia, payloads Vonage
│   │   ├── DATABASE.md            ← Prisma patterns, migraciones, seeds, queries comunes
│   │   └── TESTING.md             ← Pact provider, Supertest, Testcontainers setup
│   ├── src/
│   └── package.json
├── frontend/
│   ├── docs/                      ← Frontend-specific (Definen en D-07)
│   │   ├── AGENTS.md              ← Patrones: hooks, components, state, Vonage SDK, error boundaries
│   │   ├── COMPONENTS.md          ← UI kit, VonageVideo, IncidentCard, Toast...
│   │   ├── STATE.md               ← TanStack Query: keys, cache, invalidation
│   │   ├── VIDEO_INTEGRATION.md   ← SDK init, tokens, reconexión, cleanup
│   │   └── TESTING.md             ← Vitest + RTL, Playwright setup
│   ├── src/
│   └── package.json
└── package.json (raíz)
```

### Qué define cada `AGENTS.md` (resumen)

| `backend/docs/AGENTS.md` | `frontend/docs/AGENTS.md` |
|--------------------------|---------------------------|
| Services puras (sin Express), inyectables | Hooks con lógica de negocio separada |
| Middleware chain: auth → validate → route | Components: presentacional vs contenedor |
| Prisma: transacciones, `include` vs `select` | TanStack Query: queryKeys, staleTime, invalidation |
| Vonage Server SDK: error handling, retries | Vonage Web SDK: init, events, cleanup en useEffect |
| Logging: `pino` child loggers + correlationId | Error boundaries + toast notifications |
| Testing: `describe` por service, mocks Vonage | Testing: render + userEvent, mock hooks |

**Ventajas**: onboarding rápido, decisiones locales trazadas, IA contextual (Copilot lee el AGENTS.md del workspace donde estás).

> **D-06 y D-07** (docs por workspace) quedan **fuera del plazo de 4 semanas**. Se abordan solo si sobra tiempo en la semana 4.

---

## 15. Cadencia de Reuniones (Acordado)

| Qué | Cuándo | Duración | Quién |
|-----|--------|----------|-------|
| **Sync semanal** | 2× por semana (ej. Lun + Jue) | **Máx 30 min** | 3 devs + mentora |
| **Formato** | 1. Qué hice / qué haré / blockers (5 min c/u)  2. Decisiones rápidas / aprobar PRs pendientes | | |
| **Comunicación async** | Slack / GitHub PR reviews / Issues para todo lo demás | | |

> Objetivo: **ceremonia ligera**, trabajo real en PRs y issues.

---

## 16. Próximos Pasos Inmediatos — Para Empezar YA

1. **Issues ya creados en GitHub Project #2** (sin asignar), según [`TASKS.md`](./TASKS.md)
2. **Arrancar en paralelo**: `T0` monorepo, `T1` contrato, `T2` modelo+DB, `X1` interfaces, `X3` HMAC
3. **Arrancar docs en paralelo**: `D-01` (AGENTS) y `D-02` (ARCHITECTURE v0)
4. **Semana 2**: carriles `A` (video), `B` (SMS), `C` (frontend)
5. **Semana 3**: `I1` integración real con ngrok
6. **Semana 4**: `I2` edge cases (best effort) + demo

---

## 17. Checklist: ¿Están Listas las Tareas de Definición para Empezar?

| Tarea | Artefacto | ¿Lista para empezar? | Qué necesita la dev día 1 |
|-------|-----------|---------------------|---------------------------|
| **D-01** | `docs/AGENTS.md` | ✅ Sí | Ver `MVP_DEFINITION.md`, `TASKS.md`, repo clonado |
| **D-02** | `docs/ARCHITECTURE.md` v0 | ✅ Sí | Ver `MVP_DEFINITION.md`, decidir Mermaid, Docker decision |
| **T1** | `backend/openapi.yaml` | ✅ Sí | Ver `MVP_DEFINITION.md`, OpenAPI 3.1 |
| **T2** | `backend/prisma/schema.prisma` + docker | ✅ Sí | Ver `MVP_DEFINITION.md`, Prisma docs |

**Todo el equipo puede empezar la semana 1** con estas 4 tareas + enablers (`T0`, `X1`, `X3`).

---

## 18. Referencias Vonage (Para AGENTS.md / D-01)

- Video API 1-a-1: https://developer.vonage.com/en/learning-center/one-on-one-session-video-learning-path
- Video SDK Web: https://developer.vonage.com/en/video/api-reference/client-sdk-javascript
- Messages API (SMS): https://developer.vonage.com/en/messaging/overview
- Server SDK Node: https://github.com/Vonage/vonage-node-sdk
- Webhook Signing: https://developer.vonage.com/en/concepts/guides/signing-messages
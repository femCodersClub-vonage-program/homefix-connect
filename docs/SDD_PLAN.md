# SDD Plan — Homefix Connect (MVP)

> **Specification-Driven Development**: Definimos contratos, modelos y arquitectura **antes** de codificar. Cada spec es fuente de verdad y genera tests + implementación.
>
> **Equipo**: 4 personas (1 mentora + 3 desarrolladoras) — todas tocan todo, rotación semanal.

---

## 1. Metodología SDD en este Proyecto

```
┌─────────────────────────────────────────────────────────────────┐
│  FASE DE DEFINICIÓN (Semanas 1-2) — "Specs First"              │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ EL EQUIPO (3 desarrolladoras) DEFINEN ESTOS ARTEFACTOS:   │  │
│  │  Mentora guía, revisa y aprueba — NO los escribe ella.   │  │
│  │  1. AGENTS.md          → Guía de trabajo, flujo, comandos,│  │
│  │                           constraints IA, testing, Docker  │  │
│  │  2. ARCHITECTURE.md    → Diagramas C4, decisiones, seguridad,│  │
│  │                           observabilidad (logging a archivo)│  │
│  │  3. DATA_MODEL.md      → Esquema Prisma, ER, seeds, índices │  │
│  │  4. API_CONTRACTS.md   → OpenAPI 3.1 (endpoints, webhooks)  │  │
│  │  5. TASKS.md           → Breakdown tareas implementación    │  │
│  └───────────────────────────────────────────────────────────┘  │
│                          ↓                                      │
│  FASE DE IMPLEMENTACIÓN (Semanas 3-6) — "Tests First"          │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ Para cada tarea vertical (spec ya aprobada):              │  │
│  │  • Spec → genera types (`pnpm gen:types`)                 │  │
│  │  • Test de contrato/unitario (rojo) — OBLIGATORIO        │  │
│  │  • Implementación backend + frontend (verde)              │  │
│  │  • `pnpm check` (lint + typecheck)                        │  │
│  │  • Preview deploy local (demo en local)                   │  │
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
| **E2E** | Playwright | Flujo completo: 2 browsers (tenant + tech) → join → hangup → SMS | Semana 5-6, obligatorio para demo |

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

## 7. Tareas de Definición (Semanas 1-2) — Las Define el Equipo (3 Desarrolladoras)

| ID | Artefacto | Owner | Qué Define | Criterios de Aceptación |
|----|-----------|-------|------------|-------------------------|
| **D-01** | `docs/AGENTS.md` (raíz) | Dev 1 | Flujo global, commits, branching, testing, Docker, constraints IA, troubleshooting, Vonage refs, flujo diario real | Nueva persona onboardea en < 30 min; CI respeta constraints IA |
| **D-02** | `docs/ARCHITECTURE.md` | Dev 2 | C4 diagrams, seguridad, observabilidad (solo logging a archivo), despliegue local, ADR log, decisión Docker | Diagramas renderizan en GitHub; logging a archivo definido |
| **D-03** | `docs/DATA_MODEL.md` | Dev 3 | Prisma schema, ER, seeds, índices, migraciones, consultas comunes, `docker-compose.yml` Postgres | `pnpm db:push` + `pnpm db:seed` + `docker-compose up -d` funcionan |
| **D-04** | `docs/API_CONTRACTS.md` + `backend/openapi.yaml` | Dev 1 | OpenAPI 3.1: endpoints, schemas, errores, webhooks Vonage, auth headers, Pact structure | `pnpm gen:types` genera types frontend sin errores; `pnpm test:contract` corre |
| **D-05** | `docs/TASKS.md` | Dev 2 + Dev 3 | Breakdown S3-S6, vertical slices, rotación 3 devs, story points, GitHub Project columns, testing strategy por tarea | Issues creables en GitHub Project #2; cada tarea tiene test plan |
| **D-06** | `backend/docs/` (5 archivos) | Dev 2 | AGENTS.md, SERVICES.md, WEBHOOKS.md, DATABASE.md, TESTING.md — **patrones backend** | Onboarding backend en < 20 min; patrones documentados |
| **D-07** | `frontend/docs/` (5 archivos) | Dev 3 | AGENTS.md, COMPONENTS.md, STATE.md, VIDEO_INTEGRATION.md, TESTING.md — **patrones frontend** | Onboarding frontend en < 20 min; patrones documentados |

**Rol de la mentora**: Revisa PRs, pregunta, desafía, aprueba — **NO escribe los documentos**.

**Entregable Semana 2**: Los 7 artefactos aprobados en PR + `pnpm gen:types` verde + seed data cargado + `docker-compose up -d` funcional.

---

## 8. Tareas de Implementación (Semanas 3-6) — Vertical Slices

| Semana | Slice Vertical | Tareas Clave (ejemplos) | Tests Requeridos |
|--------|----------------|-------------------------|------------------|
| **3** | **Video Tokens + Join** | `POST /video-tokens`, `VideoService.generateToken`, Vonage SDK init frontend, página `VideoCall`, hook `useVideoSession` | Contract: token endpoint. Unit: VideoService. E2E: join call (1 browser) |
| **4** | **Video Webhooks + SMS** | `POST /webhooks/video-events` (HMAC), `session.end` → update BD + disparar SMS, `MessagingService.sendPostVisitSMS`, `POST /webhooks/message-status`, toast UI "Visita finalizada" | Contract: ambos webhooks. Unit: MessagingService. Integration: webhook → SMS → BD. E2E: 2 browsers join → hangup → SMS |
| **5** | **Edge Cases + Integración** | Reconexión automática, fallback cron job, rate limiting, error boundaries, accesibilidad básica | Unit: reconexión, rate limit. E2E: red inestable, reconexión, fallback job |
| **6** | **Hardening + Demo Local** | Seguridad (helmet, CORS, secret scan), logging a archivo verificado, docs finales, **demo grabada en local**, retrospectiva | E2E completo passing. Security scan. Logs en archivo correctos. |

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
| 1 (Def) | D-01 (AGENTS raíz) | D-02 (ARCHITECTURE) | D-03 (DATA_MODEL + docker-compose) | Revisa PRs, aprueba |
| 2 (Def) | D-04 (API_CONTRACTS) | D-05 (TASKS) + **D-06 (backend/docs/)** | D-05 (TASKS) + **D-07 (frontend/docs/)** | Revisa todo, aprueba PRs |
| 3 | Backend-heavy (tokens) | Frontend-heavy (VideoCall) | Testing-heavy (contracts/unit) | Video SDK, unblocks |
| 4 | Backend-heavy (webhooks/SMS) | Frontend-heavy (toast/estados) | Testing-heavy (integration/E2E) | Webhooks, SMS logic |
| 5 | Edge cases backend | Edge cases frontend | E2E completo + a11y | Revisión integración |
| 6 | Seguridad + logging | Demo prep + docs | Load test local + retro | Demo final, cierre |

> Todas tocan backend + frontend + testing. "Heavy" = lleva la iniciativa en ese slice.

---

## 12. GitHub Project #2 — Columns

```
Backlog → Definición (D-01..D-05) → Ready (specs done) → In Progress → In Review → Done
```

- **Definición**: Tareas D-01 a D-05 (semanas 1-2) — **las escriben las 3 devs**
- **Ready**: Spec aprobada en PR, lista para implementar
- **In Review**: PR abierto, CI verde, esperando approval

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

> **D-06 y D-07** se hacen en **paralelo** en Semana 2 (mientras D-02, D-04, D-05). Cada dev documenta su área de ownership.

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

1. **Crear issues D-01 a D-07 en GitHub Project #2** (asignar owners: Dev 1, 2, 3)
2. **Inicializar monorepo** (`pnpm-workspace.yaml`, `package.json` root, workspaces backend/frontend)
3. **Crear `docker-compose.yml` solo Postgres** (Dev 3 en D-03)
4. **Semana 1**: Kickoff 30 min → Dev 1 empieza D-01 (`docs/AGENTS.md`), Dev 3 empieza D-03 (`docs/DATA_MODEL.md`) en paralelo
5. **Semana 2**: Dev 2 hace D-02 (`docs/ARCHITECTURE.md`), Dev 1 hace D-04 (`docs/API_CONTRACTS.md`), Dev 2+3 hacen D-05 (`docs/TASKS.md`) + **Dev 2 hace D-06 (`backend/docs/`)**, **Dev 3 hace D-07 (`frontend/docs/`)** en paralelo

---

## 17. Checklist: ¿Están Listas las Tareas de Definición para Empezar?

| Tarea | Artefacto | Owner | ¿Lista para empezar? | Qué necesita la dev día 1 |
|-------|-----------|-------|---------------------|---------------------------|
| **D-01** | `docs/AGENTS.md` (raíz) | Dev 1 | ✅ Sí | Ver `MVP_DEFINITION.md`, este `SDD_PLAN.md`, repo clonado |
| **D-02** | `docs/ARCHITECTURE.md` | Dev 2 | ✅ Sí | Ver `MVP_DEFINITION.md`, decidir C4 tool (Mermaid en MD), Docker decision |
| **D-03** | `docs/DATA_MODEL.md` | Dev 3 | ✅ Sí | Ver `MVP_DEFINITION.md`, Prisma docs, crear `docker-compose.yml` Postgres |
| **D-04** | `docs/API_CONTRACTS.md` + `backend/openapi.yaml` | Dev 1 | ✅ Sí | Ver `MVP_DEFINITION.md` (endpoints + webhooks), OpenAPI 3.1 spec, Pact docs |
| **D-05** | `docs/TASKS.md` | Dev 2 + Dev 3 | ✅ Sí | Ver este `SDD_PLAN.md` (semanas 3-6), GitHub Project #2 columns |
| **D-06** | `backend/docs/` (5 archivos) | Dev 2 | ✅ Semana 2 | Ver `docs/ARCHITECTURE.md` (cuando exista), Prisma/Vonage patterns |
| **D-07** | `frontend/docs/` (5 archivos) | Dev 3 | ✅ Semana 2 | Ver `docs/API_CONTRACTS.md` (tipos), Vonage Video SDK docs |

**Tareas D-01 a D-05**: listas para **Semana 1**. **D-06 y D-07**: listas para **Semana 2** (dependen de D-02/D-04).

---

## 18. Referencias Vonage (Para AGENTS.md / D-01)

- Video API 1-a-1: https://developer.vonage.com/en/learning-center/one-on-one-session-video-learning-path
- Video SDK Web: https://developer.vonage.com/en/video/api-reference/client-sdk-javascript
- Messages API (SMS): https://developer.vonage.com/en/messaging/overview
- Server SDK Node: https://github.com/Vonage/vonage-node-sdk
- Webhook Signing: https://developer.vonage.com/en/concepts/guides/signing-messages
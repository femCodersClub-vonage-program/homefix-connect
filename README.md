# Homefix Connect

Aplicación web para coordinar la **visita virtual de una avería** en una vivienda de alquiler. El MVP parte de una **incidencia ya reportada con visita asignada**: la inquilina y el técnico entran a una videollamada 1-a-1, y al finalizar se envían SMS automáticos al gestor/propietario y a la inquilina notificando que la visita se realizó.

> **¿Primera vez en el repo?** Guía paso a paso para instalar, levantar, comprobar y apagar el proyecto: [`docs/LOCAL_SETUP.md`](docs/LOCAL_SETUP.md).

## 🎯 Problema que resuelve

La coordinación de una reparación puede requerir varios intercambios entre la persona que reporta la avería y el técnico. La información puede quedar dispersa y las personas implicadas pueden no conocer el estado de la incidencia o la fecha de la visita.

## 👥 Perfiles de usuario

| Rol | Descripción |
|-----|-------------|
| **Inquilina** | Reporta y consulta la incidencia, participa en la videollamada y recibe notificaciones |
| **Técnico** | Participa en la visita virtual evaluando la avería |
| **Propietaria / Gestora** | Consulta el estado y recibe avisos relevantes |

## 🚀 Flujo principal del MVP

> El MVP **no** cubre la creación de incidencias ni la propuesta de citas: arranca cuando la incidencia ya existe con una visita asignada.

1. **Entrar a la videollamada** — La inquilina y el técnico acceden a una sala de vídeo 1-a-1 desde el navegador.
2. **Videollamada** — Ambos se ven y oyen para evaluar la avería.
3. **Fin de la visita → SMS** — Al colgar, se envían dos SMS automáticos (gestor/propietario e inquilina): *"Visita realizada. Cuando el informe esté listo te notificaremos."*

## 🛠 Stack tecnológico

| Componente | Tecnología |
|------------|------------|
| **Monorepo** | pnpm workspaces (`backend/` + `frontend/`) |
| **Backend** | Node 24 + TypeScript + Express + Prisma ORM |
| **Frontend** | React + TypeScript + Vite + TanStack Query |
| **Base de datos** | PostgreSQL 16 (docker-compose local) |
| **Mensajería** | Vonage Messages API (SMS + webhooks de estado) |
| **Videollamada** | Vonage Video API (Server SDK + Web SDK) |
| **Testing** | Vitest (unit), Pact (contract), Supertest (integration), Playwright (e2e) |
| **Webhooks local** | ngrok |
| **CI/CD** | GitHub Actions |
| **Observabilidad** | `pino` → logging a archivo (JSONL) |

## 📋 Requisitos previos

| Requisito | Versión | Cómo comprobarlo |
|-----------|---------|------------------|
| Node.js | **24** (`.nvmrc`) | `node -v` |
| pnpm | **12** (vía `corepack`) | `corepack enable pnpm && pnpm -v` |
| Docker + Compose | cualquiera reciente | `docker compose version` |
| Cuenta Vonage | Video + Messages | solo para la integración real (semana 3) |
| ngrok | cualquiera reciente | solo para webhooks locales |

> ⚠️ Este proyecto usa **pnpm**, no `npm` ni `yarn`. `npm install` rompe el
> monorepo.
> ℹ️ **Docker solo se usa para PostgreSQL.** Backend y frontend corren nativos.

## ⚙️ Configuración del entorno

```bash
# 1. Clonar
git clone git@github.com:femCodersClub-vonage-program/homefix-connect.git
cd homefix-connect

# 2. Instalar todo el monorepo (backend + frontend + raíz)
pnpm install

# 3. Configuración local (un único .env en la raíz)
cp -n .env.example .env

# 4. Base de datos
pnpm db:up       # arranca PostgreSQL en Docker
pnpm db:push     # crea/actualiza las tablas
pnpm db:seed     # datos de demo (incidencia, visita, sesión)
```

`db:push` y `db:seed` solo hacen falta la primera vez, o cuando cambie
`backend/prisma/schema.prisma`.

### Variables de entorno

Un solo archivo `.env` en la raíz (plantilla: [`.env.example`](.env.example)).
Las claves de Vonage pueden quedarse vacías hasta la integración real: solo
fallan los endpoints que las usan.

```env
NODE_ENV=development
PORT=3000
LOG_LEVEL=info

DATABASE_URL=postgresql://homefix:homefix@localhost:5432/homefix?schema=public

# Vonage Video
VONAGE_API_KEY=
VONAGE_API_SECRET=
VONAGE_APPLICATION_ID=
VONAGE_PRIVATE_KEY_PATH=./private.key

# Vonage Messages / SMS
VONAGE_MESSAGES_FROM=
MANAGER_PHONE=
TENANT_PHONE=
TECHNICIAN_PHONE=

# Webhooks (ngrok en local)
WEBHOOK_BASE_URL=http://localhost:3000
VONAGE_SIGNATURE_SECRET=

# Frontend (solo se exponen las VITE_*)
VITE_API_BASE_URL=
```

> ⚠️ **Seguridad**: nunca subas `.env`, `private.key` ni credenciales a Git. Usa
> `.env.example` como plantilla.

## 🏃‍♂️ Ejecución en desarrollo

```bash
pnpm dev              # backend :3000 + frontend :5173 en paralelo

# o por separado
pnpm dev:backend
pnpm dev:frontend
```

Abre **http://localhost:5173**. Deberías ver «Homefix Connect» y la tarjeta
**Backend: ok**.

Webhooks locales (a partir de la semana 3, con Vonage real):

```bash
ngrok http 3000
# copia la URL https en WEBHOOK_BASE_URL del .env y en el dashboard de Vonage
```

Comprobar que la base de datos responde:

```bash
curl http://localhost:3000/api/incidents/inc_demo
```

## 🧪 Testing

```bash
pnpm check                        # lint + typecheck (ambos workspaces)
pnpm test                         # Vitest (backend + frontend)
pnpm build                        # compila ambos workspaces

# por workspace
pnpm --filter backend test
pnpm --filter frontend test
```

Los tests de contrato (Pact) y E2E (Playwright) se añaden con las tareas **A5**,
**B5**, **C6** e **I1**; sus scripts (`test:contract`, `test:e2e`) todavía no
existen.

## 📁 Estructura del proyecto

```
homefix-connect/
├── docs/                          # Documentación cross-cutting
│   ├── AGENTS.md                  # Guía de trabajo (ramas, commits, IA, tests)
│   ├── ARCHITECTURE.md            # v0: ADRs + diagramas
│   ├── LOCAL_SETUP.md             # Cómo levantar y apagar el proyecto
│   ├── MVP_DEFINITION.md          # Alcance y escenarios Gherkin
│   ├── SDD_PLAN.md                # Metodología SDD
│   ├── TASKS.md                   # Plan de tareas y orden de toma
│   └── Homefix_Connect_MVP_Casos_de_Uso.md
├── backend/
│   ├── AGENTS.md                  # Reglas específicas del backend
│   ├── prisma/schema.prisma       # Modelo de datos (v0)
│   ├── src/
│   │   ├── index.ts               # Arranque (:3000)
│   │   ├── app.ts                 # Express: middlewares y rutas
│   │   ├── config/env.ts          # Validación de entorno (zod)
│   │   ├── lib/logger.ts          # pino → logs/app.jsonl
│   │   ├── db/                    # PrismaClient + seed
│   │   └── routes/                # Endpoints
│   └── logs/app.jsonl             # Generado al ejecutar (ignorado por git)
├── frontend/
│   ├── AGENTS.md                  # Reglas específicas del frontend
│   ├── index.html
│   ├── vite.config.ts             # Proxy /api → :3000 · envDir raíz
│   └── src/
│       ├── main.tsx               # QueryClientProvider
│       ├── App.tsx                # Pantalla de humo
│       ├── api/http.ts            # Cliente provisional (C1 lo sustituye)
│       └── test/setup.ts
├── .github/workflows/ci.yml       # Lint + typecheck + test + build
├── docker-compose.yml             # Solo PostgreSQL
├── package.json                   # Scripts raíz
├── pnpm-workspace.yaml            # Workspaces + allowBuilds
├── tsconfig.base.json             # Configuración TS compartida
└── .env.example
```

> `backend/openapi.yaml` (T1) y las carpetas `services/`, `webhooks/`,
> `components/` y `pages/` **se crean con sus tareas**. No las añadas vacías.

## 📚 Documentación

- [Guía de puesta en marcha](./docs/LOCAL_SETUP.md) — Instalar, levantar, comprobar y apagar, paso a paso
- [AGENTS.md](./docs/AGENTS.md) — Ramas, commits, testing, entorno y constraints para IA
- [Arquitectura v0](./docs/ARCHITECTURE.md) — ADRs, diagramas, seguridad y observabilidad
- [Plan de tareas](./docs/TASKS.md) — Oleadas, dependencias y orden de toma
- [Definición del MVP](./docs/MVP_DEFINITION.md) — Alcance, escenarios Gherkin, APIs Vonage y criterios de aceptación
- [Plan SDD](./docs/SDD_PLAN.md) — Metodología Specification-Driven Development
- [MVP y Casos de Uso](./docs/Homefix_Connect_MVP_Casos_de_Uso.md) — Documento de definición inicial (referencia)

## 🔐 Seguridad

- Las credenciales y claves privadas de Vonage se guardan en variables de entorno y **nunca** se suben a Git
- Los tokens de vídeo se generan en el backend y solo se entregan a participantes autorizados
- Los webhooks de Vonage se validan por firma antes de procesarse
- La autenticación es **simulada** con `X-User-Id` / `X-User-Role` (fuera de alcance el login real)
- Los datos personales y teléfonos se limitan a lo necesario para la demo
- No se grabarán videollamadas en el alcance inicial

## 🤝 Contribuir

1. Toma un issue de [`docs/TASKS.md`](./docs/TASKS.md) y **refínalo antes de codear**
2. Crea la rama desde `main`: `<prefijo>/<ID>-<slug>` (ej. `feat/A3-video-tokens`)
3. Commit siguiendo [Conventional Commits](https://www.conventionalcommits.org/)
   (`feat:`, `fix:`, `spec:`, `test:`, `docs:`, `chore:`…)
4. `pnpm check && pnpm test` en verde
5. Abre un Pull Request: **CI verde + 1 approval** → **squash merge**

Detalle completo en [`docs/AGENTS.md`](./docs/AGENTS.md).

---

**Mentora**: Mariellys Soto
**Plazo**: proyecto de 6 semanas totales · **quedan 4 semanas**
**Equipo**: 1 mentora + 3 desarrolladoras

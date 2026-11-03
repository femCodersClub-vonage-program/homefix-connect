# Homefix Connect

Aplicación web para coordinar la **visita virtual de una avería** en una vivienda de alquiler. El MVP parte de una **incidencia ya reportada con visita asignada**: la inquilina y el técnico entran a una videollamada 1-a-1, y al finalizar se envían SMS automáticos al gestor/propietario y a la inquilina notificando que la visita se realizó.

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
| **Backend** | Node.js + TypeScript + Express + Prisma ORM |
| **Frontend** | React + TypeScript + Vite + TanStack Query |
| **Base de datos** | PostgreSQL (docker-compose local) |
| **Mensajería** | Vonage Messages API (SMS + webhooks de estado) |
| **Videollamada** | Vonage Video API (Server SDK + Web SDK) |
| **Testing** | Vitest (unit), Pact (contract), Supertest (integration), Playwright (e2e) |
| **Webhooks local** | ngrok |
| **CI/CD** | GitHub Actions |
| **Observabilidad** | `pino` → logging a archivo (JSONL) |

## 📋 Requisitos previos

- Node.js 18+
- pnpm (recomendado)
- Docker (para levantar PostgreSQL con `docker-compose`)
- Cuenta de Vonage (para Messages API y Video API)
- ngrok (para desarrollo local con webhooks)

## ⚙️ Configuración del entorno

```bash
# Clonar el repositorio
git clone <repo-url>
cd homefix-connect

# Instalar dependencias (monorepo con pnpm workspaces)
pnpm install

# Levantar PostgreSQL
docker-compose up -d postgres

# Copiar archivos de entorno de ejemplo
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Configurar variables de entorno (ver sección abajo)
```

### Variables de entorno

**`backend/.env`**

```env
# Base de datos
DATABASE_URL="postgresql://user:password@localhost:5432/homefix?schema=public"

# Vonage Messages API
VONAGE_MESSAGES_API_KEY="your_messages_api_key"
VONAGE_MESSAGES_API_SECRET="your_messages_api_secret"
VONAGE_SMS_FROM="Homefix"
VONAGE_WEBHOOK_SECRET="your_webhook_secret"

# Vonage Video API
VONAGE_VIDEO_API_KEY="your_video_api_key"
VONAGE_VIDEO_API_SECRET="your_video_api_secret"
VONAGE_VIDEO_APPLICATION_ID="your_application_id"
VONAGE_VIDEO_PRIVATE_KEY_PATH="./private.key"

# App
PORT=3000
NODE_ENV=development
FRONTEND_URL="http://localhost:5173"
WEBHOOK_BASE_URL="https://xxxx.ngrok-free.app"
```

**`frontend/.env`**

```env
VITE_API_BASE_URL="http://localhost:3000/api/v1"
VITE_VONAGE_VIDEO_API_KEY="your_public_video_api_key"
```

> ⚠️ **Seguridad**: Nunca subas los archivos `.env` ni claves privadas a Git. Usa los `.env.example` como plantilla.

## 🏃‍♂️ Ejecución en desarrollo

```bash
# 1. PostgreSQL
docker-compose up -d postgres

# 2. Backend + Frontend (concurrently)
pnpm dev            # backend:3000 + frontend:5173

# 3. Webhooks local (terminal aparte)
ngrok http 3000     # copiar URL https a WEBHOOK_BASE_URL en backend/.env
```

Comandos individuales, si se necesitan:

```bash
pnpm --filter backend dev
pnpm --filter frontend dev
```

## 🧪 Testing

```bash
# Todos los tests (unit + contract)
pnpm test

# Solo tests de contrato (Pact)
pnpm test:contract

# Solo tests end-to-end (Playwright)
pnpm test:e2e

# Tests con cobertura
pnpm test:coverage

# Por workspace
pnpm --filter backend test
pnpm --filter frontend test
```

## 📁 Estructura del proyecto

```
homefix-connect/
├── docs/                          # Documentación cross-cutting
│   ├── MVP_DEFINITION.md
│   ├── SDD_PLAN.md
│   └── Homefix_Connect_MVP_Casos_de_Uso.md
├── backend/                       # API REST (Express + TypeScript + Prisma)
│   ├── docs/                      # Documentación backend-specific
│   │   ├── AGENTS.md
│   │   ├── SERVICES.md
│   │   ├── WEBHOOKS.md
│   │   ├── DATABASE.md
│   │   └── TESTING.md
│   ├── src/
│   │   ├── routes/                # Endpoints de la API
│   │   ├── services/              # Lógica de negocio + integraciones Vonage
│   │   ├── webhooks/              # Webhooks Vonage (Video + Messages)
│   │   ├── prisma/                # Esquema y migraciones de BD
│   │   └── utils/                 # Helpers y validaciones
│   ├── openapi.yaml               # Fuente de verdad de la API
│   └── tests/
├── frontend/                      # App React (Vite + TypeScript)
│   ├── docs/                      # Documentación frontend-specific
│   │   ├── AGENTS.md
│   │   ├── COMPONENTS.md
│   │   ├── STATE.md
│   │   ├── VIDEO_INTEGRATION.md
│   │   └── TESTING.md
│   ├── src/
│   │   ├── api/                   # Cliente generado desde OpenAPI
│   │   ├── components/            # Componentes UI reutilizables
│   │   ├── pages/                 # Páginas principales
│   │   ├── hooks/                 # Custom hooks
│   │   └── types/                 # Tipos TypeScript compartidos
│   └── tests/
├── .github/workflows/             # CI/CD pipelines
├── .gitignore
├── docker-compose.yml             # PostgreSQL local
├── package.json                   # Workspace root (pnpm)
├── pnpm-workspace.yaml
└── README.md
```

## 📚 Documentación

- [Definición del MVP](./docs/MVP_DEFINITION.md) — Alcance reducido, escenarios Gherkin, APIs Vonage y criterios de aceptación
- [Plan SDD](./docs/SDD_PLAN.md) — Metodología Specification-Driven Development, tareas de definición (D-01…D-07), testing, rotación del equipo
- [MVP y Casos de Uso](./docs/Homefix_Connect_MVP_Casos_de_Uso.md) — Documento de definición inicial completo (referencia)

## 🔐 Seguridad

- Las credenciales y claves privadas de Vonage se guardan en variables de entorno y **nunca** se suben a Git
- Los tokens de vídeo se generan en el backend y solo se entregan a participantes autorizados
- Los webhooks de Vonage se validan por firma HMAC
- Los datos personales y teléfonos se limitan a lo necesario para la demo
- No se grabarán videollamadas en el alcance inicial

## 🤝 Contribuir

1. Crea una rama desde `main` (`git checkout -b feature/<task-id>-<descripcion>`)
2. Commit siguiendo [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `test:`…)
3. Push a la rama (`git push origin feature/<task-id>-<descripcion>`)
4. Abre un Pull Request (requiere CI verde + 1 approval)

---

**Mentora**: Mariellys Soto  
**Duración estimada**: 6 semanas  
**Equipo**: 1 mentora + 3 desarrolladoras
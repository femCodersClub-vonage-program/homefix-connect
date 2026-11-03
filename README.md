# Homefix Connect

Aplicación web para simplificar la comunicación y coordinación de reparaciones en viviendas de alquiler. Permite registrar una avería, coordinar una visita virtual con un técnico, realizar una videollamada para evaluar el problema y comunicar el diagnóstico y los siguientes pasos.

## 🎯 Problema que resuelve

La coordinación de una reparación puede requerir varios intercambios entre la persona que reporta la avería y el técnico. La información puede quedar dispersa y las personas implicadas pueden no conocer el estado de la incidencia o la fecha de la visita.

## 👥 Perfiles de usuario

| Rol | Descripción |
|-----|-------------|
| **Inquilina** | Registra la avería, consulta su estado y participa en la visita virtual |
| **Técnico** | Revisa la incidencia, participa en la visita, registra el diagnóstico y propone los siguientes pasos |
| **Propietaria / Gestora** | Consulta el estado y recibe avisos relevantes |

## 🚀 Flujo principal del MVP

1. **Reporte** — La inquilina registra una incidencia con título, descripción, vivienda y prioridad
2. **Programación** — Se propone y confirma una fecha y hora para una visita virtual
3. **Notificación** — Las personas implicadas reciben la información relevante de la cita (SMS via Vonage)
4. **Videollamada** — La inquilina y el técnico acceden a una sala de vídeo desde el navegador
5. **Diagnóstico** — El técnico registra observaciones e indica si hace falta una reparación presencial
6. **Seguimiento** — La incidencia se actualiza y se comunica el resultado y el siguiente paso

## 🛠 Stack tecnológico

| Componente | Tecnología |
|------------|------------|
| **Backend** | Node.js + TypeScript + Express |
| **Frontend** | React + TypeScript + Vite |
| **Base de datos** | PostgreSQL / SQLite + Prisma ORM |
| **Mensajería** | Vonage Messages API (SMS + webhooks) |
| **Videollamada** | Vonage Video API + SDK Web |
| **Testing** | Vitest / Jest + Postman |
| **Webhooks local** | ngrok |
| **CI/CD** | GitHub Actions |

## 📋 Requisitos previos

- Node.js 18+
- pnpm (recomendado) o npm
- Cuenta de Vonage (para Messages API y Video API)
- ngrok (para desarrollo local con webhooks)

## ⚙️ Configuración del entorno

```bash
# Clonar el repositorio
git clone <repo-url>
cd homefix-connect

# Instalar dependencias
pnpm install

# Copiar archivo de entorno de ejemplo
cp .env.example .env

# Configurar variables de entorno en .env
# Ver sección "Variables de entorno" abajo
```

### Variables de entorno

```env
# Base de datos
DATABASE_URL="postgresql://user:password@localhost:5432/homefix?schema=public"
# O para SQLite en desarrollo:
# DATABASE_URL="file:./dev.db"

# Vonage Messages API
VONAGE_API_KEY="your_api_key"
VONAGE_API_SECRET="your_api_secret"
VONAGE_SMS_FROM="Vonage APIs"
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
```

> ⚠️ **Seguridad**: Nunca subas el archivo `.env` ni claves privadas a Git. Usa `.env.example` como plantilla.

## 🏃‍♂️ Ejecución en desarrollo

```bash
# Terminal 1: Backend
pnpm --filter backend dev

# Terminal 2: Frontend
pnpm --filter frontend dev

# Terminal 3 (opcional): ngrok para webhooks
ngrok http 3000
```

## 🧪 Testing

```bash
# Ejecutar todos los tests
pnpm test

# Tests con cobertura
pnpm test:coverage

# Tests solo backend
pnpm --filter backend test

# Tests solo frontend
pnpm --filter frontend test
```

## 📁 Estructura del proyecto

```
homefix-connect/
├── backend/                 # API REST (Express + TypeScript)
│   ├── src/
│   │   ├── routes/         # Endpoints de la API
│   │   ├── services/       # Lógica de negocio + integraciones Vonage
│   │   ├── prisma/         # Esquema y migraciones de BD
│   │   └── utils/          # Helpers y validaciones
│   └── tests/
├── frontend/               # App React (Vite + TypeScript)
│   ├── src/
│   │   ├── components/     # Componentes UI reutilizables
│   │   ├── pages/          # Páginas principales
│   │   ├── hooks/          # Custom hooks
│   │   ├── services/       # Cliente API + Vonage Video SDK
│   │   └── types/          # Tipos TypeScript compartidos
│   └── tests/
├── docs/                   # Documentación del proyecto
│   └── Homefix_Connect_MVP_Casos_de_Uso.md
├── .github/workflows/      # CI/CD pipelines
├── .gitignore
├── package.json            # Workspace root (pnpm)
├── pnpm-workspace.yaml
└── README.md
```

## 📚 Documentación

- [MVP y Casos de Uso](./docs/Homefix_Connect_MVP_Casos_de_Uso.md) — Definición completa del alcance, flujo, modelo de datos y endpoints

## 🔐 Seguridad

- Las credenciales y claves privadas de Vonage se guardan en variables de entorno y **nunca** se suben a Git
- Los tokens de vídeo se generan en el backend y solo se entregan a participantes autorizados
- Los webhooks se validan según las capacidades de seguridad disponibles en Vonage
- Los datos personales y teléfonos se limitan a lo necesario para la demo
- No se grabarán videollamadas en el alcance inicial

## 🤝 Contribuir

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'feat: agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request


---

**Mentora**: Mariellys Soto  
**Duración estimada**: 6 semanas  
**Equipo**: FemCoders
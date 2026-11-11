---
name: sdd-07-implementation
description: "Fase 7 de SDD: Desarrollo controlado por especificación. Implementa exclusivamente los requisitos aprobados, integrando y aplicando las skills técnicas de frontend y backend del repositorio."
---

# SDD 07 — Controlled Implementation

Actúa como **Senior Software Engineer & TDD Practitioner**. Esta fase se activa **únicamente después de que el usuario haya aprobado explícitamente el plan técnico** (`specs/features/<ID>/03-plan.md`).

## Principio Fundamental
> **Cero desviaciones de alcance.** Implementa estrictamente lo que la especificación aprobó. Si durante el código descubres una contradicción, regla no contemplada o caso límite, **DETENTE inmediatamente y consulta al usuario**; no modifiques la especificación en silencio.

---

## Integración Obligatoria con las Skills Técnicas del Repositorio

Dependiendo de la capa que modifique la tarea, debes activar y aplicar los estándares de las skills locales instaladas en `skills/`:

### Para tareas de Frontend:
1. **`frontend-dev-guidelines`** (`skills/frontend-dev-guidelines/SKILL.md`):
   - Separación estricta entre componentes de UI (`components/`) y lógica de datos (`hooks/`).
   - Uso obligatorio de **TanStack Query** para peticiones a la API; prohibido `fetch` manual en `useEffect`.
   - Componentes limpios y desacoplados de SDKs de terceros (Vonage Video).
2. **`vercel-react-best-practices`** (`skills/vercel-react-best-practices/SKILL.md`):
   - Eliminar waterfalls asíncronos (`Promise.all` cuando aplique).
   - Aplicar `React.lazy` en componentes pesados o modales grandes.
   - Limpiar siempre los efectos secundarios en el retorno de `useEffect` (timers, streams de vídeo).
3. **`react-best-practices`** (`skills/react-best-practices/SKILL.md`):
   - Composición limpia mediante `props` y `children`.
   - Custom hooks con interfaces predecibles y sin JSX.
   - Estado mínimo y flujo unidireccional.

### Para tareas de Backend:
1. **`nodejs-backend-patterns`** (`skills/nodejs-backend-patterns/SKILL.md`):
   - Arquitectura en capas: `routes/` (validación de entrada y delegación) $\rightarrow$ `services/` (lógica pura y SDKs) $\rightarrow$ `db/` (Prisma singleton).
   - ESM estricto: todos los imports internos llevan extensión `.js` (`import { prisma } from './db/client.js'`).
   - Validación estricta con Zod en cuerpos, parámetros y query strings.
   - Prohibido `console.log`: usar `logger` de `src/lib/logger.ts`.
2. **`architecture-patterns`** (`skills/architecture-patterns/SKILL.md`):
   - Inversión de Dependencias (DIP): los servicios deben ser testeables sin levantar Express ni Postgres.
   - No acoplar lógica de negocio a objetos `req` o `res`.
3. **`error-handling-patterns`** (`skills/error-handling-patterns/SKILL.md`):
   - Manejo de errores centralizado en `errorHandler`.
   - Respuestas JSON uniformes `{ "error": "mensaje" }` con códigos HTTP estándar (`400`, `403`, `404`, `409`, `500`).

---

## Reglas de Codificación y Commits

- **Diffs mínimos y limpios**: No reformatear archivos ajenos ni introducir cambios cosméticos.
- **Sin refactors oportunistas**: Si encuentras código mejorable fuera del alcance, anótalo para otro issue; no lo toques aquí.
- **Commits Convencionales**: Realizar commits pequeños y con propósito definido (`feat(scope): ...`, `test(scope): ...`, `fix(scope): ...`).
- **Seguridad**: Prohibido commitear `.env`, claves privadas o teléfonos reales en código o tests.

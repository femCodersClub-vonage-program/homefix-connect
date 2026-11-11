---
name: sdd-01-project-discovery
description: "Fase 1 de SDD: Descubrimiento y mapa de contexto del proyecto. Usar al inicio de un proyecto o antes de abordar tareas complejas para mapear dominio, arquitectura y reglas."
---

# SDD 01 — Project Discovery

Actúa como **Senior Software Architect & Domain Analyst**. Tu objetivo es construir un entendimiento profundo del proyecto antes de analizar cualquier requerimiento puntual o escribir código.

## Principio Fundamental
> **Nunca asumas nada.** Explora la documentación oficial y verifica contra el código fuente real. La documentación puede estar desactualizada; el código y los tests reflejan el comportamiento vigente.

---

## Qué debes leer e inspeccionar

1. **Documentación de Proyecto y Negocio**:
   - `README.md`
   - `AGENTS.md` (y deltas en `backend/AGENTS.md`, `frontend/AGENTS.md`)
   - `docs/MVP_DEFINITION.md`
   - `docs/ARCHITECTURE.md`
   - `docs/TASKS.md` y `docs/LOCAL_SETUP.md`
2. **Modelo de Dominio y Contratos**:
   - `backend/prisma/schema.prisma`
   - `backend/openapi.yaml` (si existe) o rutas en `backend/src/routes/`
   - Tipos compartidos o interfaces de dominio
3. **Código Fuente y Flujos Existentes**:
   - Puntos de entrada (`backend/src/index.ts`, `backend/src/app.ts`, `frontend/src/main.tsx`, `frontend/src/App.tsx`)
   - Servicios, integraciones externas (Vonage, PostgreSQL)
   - Suites de pruebas (`src/**/*.test.ts(x)`)

---

## Instrucciones de Ejecución

1. **Recorrer la documentación clave** y listar los casos de uso principales del MVP.
2. **Inspeccionar el código real** para verificar discrepancias entre la especificación escrita y la implementación.
3. **Generar el reporte de contexto** en `specs/project-context.md` con la siguiente estructura:
   - **Propósito**: Qué hace el proyecto y qué problema de negocio resuelve.
   - **Casos de Uso Principales**: Resumen de los flujos soportados.
   - **Entidades de Dominio**: Entidades, enums y relaciones clave.
   - **Arquitectura y Componentes**: Separación de capas, backend, frontend, adapters externos.
   - **Integraciones Externas**: Vonage Video, Vonage Messages (SMS), PostgreSQL.
   - **Estrategia de Testing**: Tipos de pruebas (unitarias, integración, contrato) y comandos.
   - **Restricciones y Reglas**: Reglas duras de `AGENTS.md` (no inventar campos, ESM, stack fijado).
   - **Inconsistencias Detectadas**: Puntos donde la documentación y el código divergen.

---

## Salida Esperada
- Creación o actualización de `specs/project-context.md`.
- Un resumen conciso al usuario de los hallazgos principales y confirmación de que el proyecto está comprendido antes de pasar a la tarea.

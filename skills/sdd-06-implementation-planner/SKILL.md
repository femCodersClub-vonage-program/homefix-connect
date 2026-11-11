---
name: sdd-06-implementation-planner
description: "Fase 6 de SDD: Diseño y planificación técnica de la implementación. Usar para desglosar ficheros afectados, orden de ejecución, estrategia TDD y mitigar riesgos técnicos antes de codificar."
---

# SDD 06 — Implementation Planner

Actúa como **Lead Tech Architect & Implementation Strategist**. Tu objetivo es traducir la especificación aprobada en una hoja de ruta técnica precisa, ordenada y libre de ambigüedades.

## Principio Fundamental
> **No toques código hasta que el plan esté aprobado.** Diseñar la estrategia paso a paso ahorra horas de depuración y evita cambios accidentales en archivos ajenos al alcance.

---

## Estructura del Plan Técnico (`specs/features/<ID>/03-plan.md`)

El documento debe incluir:

### 1. Desglose de Ficheros Afectados
Clasifica cada archivo con etiquetas explícitas:
- `[NEW]` `ruta/al/nuevo-fichero.ts`: Propósito y responsabilidad.
- `[MODIFY]` `ruta/al/fichero-existente.ts`: Qué función o bloque cambia y por qué.
- `[DELETE]` `ruta/al/fichero.ts`: Justificación de la eliminación si aplica.

### 2. Cambios en Contratos y Base de Datos (si aplica)
- Si modifica `backend/openapi.yaml` o `backend/prisma/schema.prisma`, recordar la regla dura de `AGENTS.md` (requiere aprobación explícita en PR).
- Scripts de sincronización necesarios (`pnpm db:push`, `pnpm db:seed`).

### 3. Estrategia de Pruebas (Test-Driven Development)
- **Fase Roja**: Tests unitarios o de integración que deben escribirse primero para verificar el comportamiento fallido.
- **Fase Verde**: Código mínimo necesario en servicios o componentes para hacer pasar los tests.
- **Mocks y Dobles**: Definir claramente cómo se aislará Prisma o el SDK de Vonage (prohibido tocar Postgres o red en tests unitarios).

### 4. Orden Secuencial de Ejecución
Pasos numerados del 1 al N con dependencias claras (por ejemplo: primero tipos y esquemas Zod $\rightarrow$ servicio desacoplado $\rightarrow$ test unitario $\rightarrow$ ruta Express $\rightarrow$ test de integración).

### 5. Riesgos Técnicos y Mitigaciones
- Posibles regresiones en endpoints o pantallas existentes.
- Estrategia de mitigación y comprobaciones manuales necesarias.

### 6. Matriz de Trazabilidad
Tabla que relaciona cada Criterio de Aceptación (AC) con el archivo y test que lo valida.

---

## Instrucciones de Ejecución

1. Analizar el código existente y dependencias con herramientas de lectura.
2. Redactar el plan en `specs/features/<ID-tarea>-<slug>/03-plan.md`.
3. Presentar un resumen claro al usuario.
4. **Punto de parada obligatorio**: Solicitar la **aprobación explícita** del usuario antes de proceder a la fase de implementación (`sdd-07-implementation`).

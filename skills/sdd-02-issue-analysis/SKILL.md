---
name: sdd-02-issue-analysis
description: "Fase 2 de SDD: Análisis de tareas e issues de GitHub. Usar al recibir una tarea para analizar el problema de negocio, casos de uso afectados, límites de alcance y dependencias."
---

# SDD 02 — Issue Analysis

Actúa como **Lead Business Analyst & Systems Engineer**. Tu labor es diseccionar la tarea o issue asignada para entender el problema de negocio antes de proponer soluciones técnicas.

## Principio Fundamental
> **No asumas el alcance.** Un issue describe una necesidad, pero puede omitir restricciones o límites. Separa rigurosamente lo que está dentro del alcance de lo que queda explícitamente fuera.

---

## Qué debes analizar

1. **La tarea objetivo**:
   - Título, descripción y criterios de aceptación del issue de GitHub o fila de `docs/TASKS.md`.
2. **Contexto de Negocio**:
   - ¿Qué problema de negocio resuelve?
   - ¿Quién es el usuario o consumidor final (inquilina, técnica, gestora, webhook, cliente API)?
   - ¿A qué caso de uso de `docs/MVP_DEFINITION.md` responde?
3. **Estado Actual vs Estado Esperado**:
   - ¿Qué comportamiento existe hoy en el código?
   - ¿Qué comportamiento observable nuevo se espera tras la tarea?
4. **Límites de Alcance (In Scope vs Out of Scope)**:
   - Todo lo que no sea indispensable para el criterio de aceptación queda **fuera de alcance**.
5. **Dependencias y Bloqueos**:
   - **Hard Dependencies**: Tareas o PRs que deben estar mergeados antes.
   - **Soft Dependencies**: Servicios que pueden mockearse provisionalmente.

---

## Instrucciones de Ejecución

1. Crear la carpeta de la tarea: `specs/features/<ID-tarea>-<slug>/` si no existe.
2. Iniciar el archivo `specs/features/<ID-tarea>-<slug>/01-requirements.md` con la sección:
   - **1. Resumen del Problema**: Descripción concisa del valor de negocio.
   - **2. Casos de Uso Afectados**: Referencias a la documentación de MVP.
   - **3. Comportamiento Actual vs Esperado**: Diferencias funcionales observables.
   - **4. Fuera de Alcance (Out of Scope)**: Límites claros para evitar sobreingeniería.
   - **5. Dependencias**: Clasificación en Hard y Soft.
3. Rastrear en el código fuente qué archivos existentes interactúan con este flujo.

---

## Salida Esperada
- Creación de `specs/features/<ID-tarea>-<slug>/01-requirements.md` con el análisis inicial.
- Identificación de los vacíos de información para la siguiente fase (`sdd-03-requirements-clarification`).

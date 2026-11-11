---
name: sdd-04-specification-writer
description: "Fase 4 de SDD: Redacción de la especificación técnica formal. Usar para documentar contratos de entrada/salida, reglas de negocio, errores, casos límite y criterios de aceptación (Given/When/Then)."
---

# SDD 04 — Specification Writer

Actúa como **Lead Systems Architect & API Specification Designer**. Transforma los requisitos refinados y las decisiones acordadas en una especificación técnica formal, rigurosa e inequívoca.

## Principio Fundamental
> **La especificación es la fuente de verdad.** Cualquier duda técnica durante el desarrollo debe responderse leyendo este documento. Si la spec no lo define, no se implementa sin actualizarla primero.

---

## Estructura Obligatoria de la Especificación

Genera o actualiza el archivo `specs/features/<ID-tarea>-<slug>/02-specification.md` con las siguientes 14 secciones:

### 1. Resumen y Contexto
- Nombre de la tarea y referencia al issue (ej. `feat(A3): POST /video-tokens`, Closes #12).
- Contexto de negocio y objetivo observable.

### 2. Alcance (Scope)
- **Dentro de alcance (In-scope)**: Lo que se construirá en este slice.
- **Fuera de alcance (Out-of-scope)**: Lo que expresamente queda fuera para evitar creep.

### 3. Casos de Uso
- Caso de uso del MVP (`docs/MVP_DEFINITION.md`) y secuencia de interacción.

### 4. Requisitos Funcionales (RF)
- Lista numerada (`RF-01`, `RF-02`, ...) de comportamientos obligatorios sin ambigüedad.

### 5. Reglas de Negocio (RN)
- Validaciones de dominio, restricciones de estado y permisos (`RN-01`, `RN-02`, ...).

### 6. Contrato de Entrada (Input Contract)
Por cada parámetro o campo (body, params, query, headers):
- Nombre, descripción, tipo de dato (`string`, `number`, `enum`, etc.).
- ¿Requerido u opcional? Formato regex / Zod schema.
- Valores permitidos, valor por defecto y validaciones estrictas.

### 7. Contrato de Salida (Output Contract)
- Códigos HTTP de éxito (`200 OK`, `201 Created`, `204 No Content`).
- Estructura JSON exacta, tipos de dato y ejemplos de payload.

### 8. Manejo de Errores (Error Handling)
- Matriz de errores esperados según `AGENTS.md`:
  - `400 Bad Request`: Formato o validación Zod fallida (`{ "error": "mensaje" }`).
  - `403 Forbidden`: Rol o credencial no autorizada.
  - `404 Not Found`: Recurso no encontrado.
  - `409 Conflict`: Transición de estado inválida.
  - `500 Internal Server Error`: Fallo inesperado o de red.

### 9. Casos Límite (Edge Cases)
- Pérdida de conexión, payloads vacíos, cadenas con caracteres especiales, concurrencia o timeouts.

### 10. Criterios de Aceptación (Acceptance Criteria)
- Formato **Given / When / Then** conductual:
  - `Given`: Estado inicial (ej. una incidencia asignada existente).
  - `When`: Acción ejecutada (ej. petición POST a `/api/video-tokens`).
  - `Then`: Resultado observable (ej. código 201 y token JWT válido en respuesta).

### 11. Diseño Técnico
- Componentes y capas afectadas (`routes/`, `services/`, `db/` o `components/`, `hooks/`, `api/`).
- Actualizaciones a `backend/openapi.yaml` o `schema.prisma` si aplican.

### 12. Estrategia de Pruebas
- Pruebas unitarias necesarias (mocks requeridos).
- Pruebas de integración o contrato.
- Escenarios negativos a cubrir.

### 13. Dependencias
- Tareas previas, bibliotecas fijadas del stack, servicios externos (Vonage, PostgreSQL).

### 14. Preguntas Abiertas y Suposiciones
- Registro de cualquier suposición no bloqueante aprobada por el usuario.

---

## Salida Esperada
- Creación de `specs/features/<ID>/02-specification.md` completa.
- Validación de que ningún campo contradice las reglas de `AGENTS.md` o el stack fijado.

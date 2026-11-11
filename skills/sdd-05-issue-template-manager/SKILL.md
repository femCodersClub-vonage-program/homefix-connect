---
name: sdd-05-issue-template-manager
description: "Fase 5 de SDD: Gestión y cumplimentación de la plantilla de issues de GitHub (.github/ISSUE_TEMPLATE/tarea.md). Usar para sincronizar la especificación técnica con el issue del repositorio."
---

# SDD 05 — Issue Template Manager

Actúa como **GitHub Workflow & Issue Quality Specialist**. Tu tarea es trasladar la información validada en la especificación al formato formal de issue de este repositorio, garantizando que cualquier desarrolladora del equipo pueda entenderla y ejecutarla sin necesidad de leer la conversación con la IA.

## Principio Fundamental
> **Usa la plantilla existente sin inventar estructuras.** El repositorio ya cuenta con una plantilla oficial en `.github/ISSUE_TEMPLATE/tarea.md`. Rellena todas sus secciones respetando las convenciones de `AGENTS.md` §5.1 y §8.1.

---

## Estructura de `.github/ISSUE_TEMPLATE/tarea.md` a Completar

Cada issue o comentario de refinamiento debe completar rigurosamente:

### 1. Título
- Formato: `<ID> · <título corto en imperativo>` (ej. `A3 · Generar token de vídeo`).

### 2. Caso de uso (fijo)
- Extraído literalmente de `docs/MVP_DEFINITION.md` (ej. *CU-02: Técnica e inquilina se conectan a videollamada 1-a-1*). No negociable.

### 3. Criterio de aceptación (fijo, conductual)
- Checklist con el resultado observable medible (ej. `- [ ] La petición responde con token JWT firmado de Vonage y 201 Created`).

### 4. Qué hace / cómo lo hace
- **Qué**: Resultado observable en una frase directa.
- **Cómo**: Enfoque técnico, capas tocadas (`routes/`, `services/`, etc.) y decisiones tomadas.

### 5. Especificación incompleta — definición mínima
Rellena antes de codificar con el principio de datos mínimos:
- **Datos mínimos**: Solo los campos indispensables para el criterio de aceptación (sin campos "por si acaso").
- **Estados / enums**: Solo los enums del flujo del MVP definidos en `MVP_DEFINITION.md`.
- **Payload / contrato**: Estructura JSON mínima de entrada y salida; indica si requiere actualizar `backend/openapi.yaml`.
- **Errores**: Solo los códigos acordados (`400`, `403`, `404`, `409`, `500`).

### 6. Dependencias
- **Hard**: Issue que debe estar mergeado previamente (o `"ninguna"`).
- **Soft (mock hasta que exista)**: Tarea a mockear en tests (o `"ninguna"`).

### 7. Rama sugerida
- Convención: `<prefijo>/<ID>-<slug-kebab-case>` (ej. `feat/A3-video-tokens`, `spec/T1-openapi`, `fix/X3-hmac`).

---

## Instrucciones de Ejecución

1. Leer la especificación aprobada en `specs/features/<ID>/02-specification.md`.
2. Redactar el texto completo del issue según la plantilla anterior.
3. Presentar la propuesta al usuario en el chat.
4. **Regla de oro**: **No modificar el issue de GitHub directamente** sin autorización explícita del usuario. Esperar confirmación antes de actualizar el issue en remoto.

---
name: sdd-03-requirements-clarification
description: "Fase 3 de SDD: Extracción de requisitos y entrevista obligatoria de clarificación. Usar para clasificar requerimientos, formular preguntas concisas al usuario y resolver ambigüedades antes de especificar."
---

# SDD 03 — Requirements Clarification & Interview

Actúa como **Technical Product Owner & Quality Assurance Specialist**. Esta fase es **obligatoria**: antes de redactar especificaciones técnicas formales o escribir código, se deben resolver todas las ambigüedades con el usuario.

## Principio Fundamental
> **Cero suposiciones críticas.** Si falta un campo, una validación o una regla de error, se pregunta. Nunca se inventa una regla de negocio bajo la etiqueta de "suposición obvia".

---

## 1. Clasificación de Requisitos

Antes de entrevistar al usuario, clasifica cada requisito en `specs/features/<ID>/01-requirements.md`:

| Tipo | Definición | Acción |
|---|---|---|
| **Explícito** | Directamente indicado en el issue o documentación | Documentar y validar |
| **Derivado** | Inferido lógicamente de patrones existentes o reglas de arquitectura | Anotar con justificación |
| **Desconocido** | Ambigüedad, vacío en la spec o decisión de producto no definida | **Preguntar al usuario** |

---

## 2. Guía de la Entrevista de Clarificación

Formula preguntas claras al usuario sobre:
- **Datos y Contratos**: Formatos de entrada, campos requeridos vs opcionales, valores permitidos o por defecto.
- **Validaciones y Reglas de Negocio**: Estados posibles, transiciones inválidas, permisos o roles requeridos.
- **Manejo de Errores y Edge Cases**: Códigos HTTP esperados (`400`, `403`, `404`, `409`, `500`), mensajes de error, timeouts o desconexiones.
- **Límites de Alcance**: ¿Debe contemplar X ahora o queda para otra tarea?

### Reglas para formular preguntas:
1. **Sé conciso y específico**: No hagas preguntas genéricas ("¿Cómo quieres que funcione?").
2. **Explica por qué importa**: "Necesitamos saber si el campo `phone` puede ser null para definir el esquema de Prisma y el validador Zod".
3. **Ofrece alternativas con pros y contras**:
   - *Opción A (Recomendada)*: Devolver 409 Conflict si la sesión ya finalizó.
   - *Opción B*: Idempotencia con 200 OK y el estado actual.
4. **No preguntes lo que ya está en el código o en los docs**: Consulta primero `AGENTS.md` y `MVP_DEFINITION.md`.
5. **No abrumes**: Agrupa por temas (máximo 3-4 preguntas clave por turno).

---

## 3. Instrucciones de Ejecución

1. Analizar el issue y listar todas las preguntas críticas no resueltas.
2. Presentar las preguntas al usuario de forma estructurada.
3. Al recibir las respuestas, actualizar `specs/features/<ID>/01-requirements.md` en la sección **Decisiones de Clarificación Acordadas**.
4. **Regla de parada**: Si quedan preguntas críticas bloqueantes, **DETENTE**. No pases a la especificación ni a la implementación hasta tener confirmación.

---

## Salida Esperada
- `specs/features/<ID>/01-requirements.md` completo, con requisitos clasificados y decisiones registradas.
- Confirmación explícita del usuario para proceder a la redacción de la especificación técnica.

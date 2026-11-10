---
name: error-handling-patterns
description: "Estrategias de manejo de errores por capas, captura centralizada, respuestas estructuradas y registro seguro de excepciones."
---

# Error Handling Patterns

Estrategias y estándares para la gestión de errores en backend y frontend:

## 1. Manejo de Errores por Capas
- **Capa de Dominio / Servicios**: Lanzar excepciones semánticas o personalizadas (ej. `NotFoundError`, `ConflictError`, `ValidationError`).
- **Controlador / Middleware Centralizado**: Atrapar las excepciones en un `errorHandler` centralizado que traduce los tipos de error a respuestas HTTP estandarizadas.
- No capturar errores silenciosamente con bloques `try { ... } catch (e) {}` vacíos.

## 2. Formato de Respuestas de Error
- Estandarizar la salida JSON de errores según la especificación del proyecto:
  ```json
  {
    "error": "Mensaje descriptivo del error"
  }
  ```
- Códigos HTTP consistentes:
  - `400`: Entrada inválida o validación de Zod fallida.
  - `403`: Falta de permisos o rol no autorizado.
  - `404`: Recurso no encontrado.
  - `409`: Conflicto de estado (ej. sesión ya cerrada).
  - `500`: Error interno inesperado.

## 3. Logs Seguros de Excepciones
- Registrar trazas completas de error (stack traces) únicamente en logs internos a través del logger estructurado (`pino`).
- Nunca enviar stack traces ni detalles internos de la base de datos o claves en la respuesta HTTP al cliente.

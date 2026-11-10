---
name: nodejs-backend-patterns
description: "Patrones y buenas prácticas de desarrollo backend en Node.js y TypeScript con Express o frameworks modernos. Usar al diseñar rutas, controladores, middlewares, servicios y configuración."
---

# Node.js Backend Patterns

Guía de desarrollo para servicios backend en Node.js y TypeScript:

## 1. Arquitectura en Capas
- **Rutas (`routes/`)**: Encargadas únicamente de recibir la petición HTTP, validar los parámetros con Zod y delegar al servicio o repositorio correspondiente.
- **Servicios (`services/`)**: Contienen la lógica de negocio pura, orquestación y coordinación de clientes externos (ej. SDKs de Vonage). No dependen de `req` ni `res` de Express.
- **Acceso a Datos (`db/`)**: Encapsula las consultas a base de datos (Prisma) sin mezclar lógica de negocio.
- **Librería compartida (`lib/`)**: Utilidades transversales (logger, criptografía, validadores).

## 2. ESM y TypeScript Estricto
- Respetar el módulo ESM nativo de Node.js (imports relativos con extensión `.js` si aplica al proyecto).
- Tipado estricto sin uso de `any` para garantizar seguridad en tiempo de compilación.

## 3. Validación y Manejo de Configuración
- Validar todas las variables de entorno al iniciar la aplicación mediante un esquema Zod.
- Validar todo cuerpo de solicitud (body), parámetros de ruta (params) y query strings con esquemas Zod antes de procesarlos.

## 4. Observabilidad y Logs
- Prohibido el uso de `console.log` en producción. Utilizar siempre un logger estructurado (como Pino).
- Nunca incluir secretos, claves privadas, ni datos personales sensibles o teléfonos completos en los logs.

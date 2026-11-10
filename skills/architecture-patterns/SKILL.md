---
name: architecture-patterns
description: "Patrones de arquitectura backend: Clean Architecture, Arquitectura Hexagonal y Domain-Driven Design pragmático. Usar al estructurar servicios desacoplados, límites de dominio y capas de aplicación."
---

# Architecture Patterns (Clean & Hexagonal)

Directrices de diseño de arquitectura para sistemas desacoplados y testeables:

## 1. Principios de Arquitectura Hexagonal (Ports & Adapters)
- **Dominio / Aplicación**: Núcleo independiente de frameworks, bases de datos o clientes externos.
- **Puertos**: Interfaces que definen cómo el núcleo interactúa con el mundo exterior (repositorios, gateways de mensajería).
- **Adaptadores**: Implementaciones concretas de los puertos (Express routes, Prisma repositories, Vonage API adapters).

## 2. Inversión de Dependencias (DIP)
- Las capas internas (casos de uso, servicios de dominio) no dependen de las capas externas (HTTP, base de datos).
- El framework o la infraestructura depende de los contratos definidos por el dominio o la capa de aplicación.

## 3. Testabilidad Aislada
- Cada servicio debe poder ser probado de forma unitaria en milisegundos mockeando los puertos de salida (Prisma, Vonage).
- No requerir levantar la base de datos o el servidor HTTP para verificar la lógica de negocio.

## 4. Pragmatismo (KISS / YAGNI)
- No sobreingeniar con capas innecesarias si el caso de uso es directo.
- Evitar abstracciones prematuras si no aportan valor inmediato al MVP.

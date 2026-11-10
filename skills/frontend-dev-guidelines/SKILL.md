---
name: frontend-dev-guidelines
description: "Directrices para desarrollo frontend moderno con React y TypeScript. Usar al crear componentes, páginas, hooks, o al implementar data-fetching y gestión de estado."
---

# Frontend Development Guidelines (React & TypeScript)

Directrices de arquitectura, rendimiento y patrones para la capa frontend.

## 1. Principios de Arquitectura

- **Separación de Lógica y UI**: Los componentes visuales no deben contener llamadas a API directas. La obtención de datos se gestiona mediante hooks dedicados.
- **TanStack Query (React Query)**: Utilizado para todo el estado del servidor (queries y mutaciones). No usar `useEffect` para fetch manual.
- **Inversión de Dependencias**: Abstraer llamadas HTTP y SDKs (como Vonage Video) detrás de servicios o hooks desacoplados para facilitar pruebas unitarias.
- **KISS y YAGNI**: No forzar patrones innecesarios como DDD o estados globales pesados si un hook o Context API resuelve el problema.

## 2. Organización y Convenciones de Archivos

- `src/components/`: Componentes de UI reutilizables y sin lógica de negocio acoplada.
- `src/pages/` o `src/features/`: Composición de vistas por ruta o dominio.
- `src/hooks/`: Lógica reutilizable, orquestación de queries y mutaciones.
- `src/api/`: Adaptadores HTTP y clientes de API generados.

## 3. Manejo de Estado y Carga

- Priorizar límites de Suspense o estados de carga explícitos y predecibles.
- Evitar waterfalls en la obtención de datos; paralelizar peticiones cuando sean independientes.
- Estado mínimo en componentes: calcular valores derivados durante el render en lugar de sincronizarlos en `useEffect`.

## 4. Estándares TypeScript

- Tipado estricto: sin `any` implícito ni silenciamiento de errores con `as any`.
- Usar `import type` para tipos e interfaces.
- Validación de entradas con Zod y React Hook Form en formularios.

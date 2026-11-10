---
name: react-best-practices
description: "Patrones recomendados de hooks, composición y gestión de estado predecible en React. Usar al diseñar hooks personalizados, componer componentes y gestionar estado de UI."
---

# React Best Practices

Patrones de diseño de componentes y hooks en React:

## 1. Composición sobre Herencia o Props Complejas
- Favorecer la composición mediante `children` o render props cuando un componente tiene múltiples variantes visuales.
- Evitar componentes monstruo con decenas de flags booleanas para alternar comportamientos.

## 2. Diseño de Custom Hooks
- Extraer lógica de negocio y efectos a custom hooks (`use*`).
- Los custom hooks deben devolver interfaces predecibles (objetos o tuplas claras) y encapsular los detalles de implementación (como llamadas a servicios o listeners).
- Los custom hooks no deben renderizar JSX directamente.

## 3. Estado Predecible y Flujo Unidireccional
- Mantener una única fuente de verdad.
- Separar claramente el estado del servidor (manejado por React Query / TanStack Query) del estado efímero de UI (formulario, modal abierto, toggle).
- No duplicar datos del servidor en el estado local de React sin una razón explícita (como un formulario de edición desacoplado).

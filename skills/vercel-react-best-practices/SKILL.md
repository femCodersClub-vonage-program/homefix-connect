---
name: vercel-react-best-practices
description: "Reglas de optimización de rendimiento para React y aplicaciones modernas. Usar al escribir componentes React, optimizar renders, bundle size y flujos asíncronos."
---

# Vercel React Best Practices

Reglas de rendimiento y optimización prioritarias para aplicaciones React:

## 1. Eliminar Waterfalls (Crítico)
- Evitar llamadas asíncronas secuenciales innecesarias (`await a; await b;`).
- Paralelizar peticiones independientes con `Promise.all` o queries paralelas en TanStack Query.
- Colocar los datos lo más cerca posible del componente que los necesita.

## 2. Optimización de Bundle y Carga Diferida (Crítico)
- Evitar importaciones completas de barrel files si arrastran dependencias innecesarias.
- Usar lazy loading (`React.lazy`) para rutas, diálogos grandes o componentes pesados.

## 3. Optimización de Re-renders (Medio)
- Mantener el estado local al nivel más bajo posible del árbol donde sea necesario.
- Calcular datos derivados en la fase de renderizado en lugar de sincronizarlos con `useEffect`.
- Usar `useMemo` y `useCallback` estratégicamente en props pasadas a componentes pesados o listas grandes.

## 4. Rendimiento en JavaScript y Manejo de Hooks
- Usar `Map` y `Set` para búsquedas frecuentes o indexación de colecciones.
- Limpiar siempre los efectos secundarios en el retorno de `useEffect` (timers, subscripciones, tracks multimedia).
- Evitar mutaciones directas de estado o referencias durante el render.

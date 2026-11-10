---
name: Tarea
about: Tarea pequeña (≤ 1 día, 1 PR) con caso de uso y criterio de aceptación
title: "<ID> · <título corto>"
labels: ""
assignees: ""
---

## Caso de uso (fijo)

<!-- Tomado de docs/MVP_DEFINITION.md. No se negocia. -->

## Criterio de aceptación (fijo, conductual)

- [ ] <!-- Resultado observable -->

## Qué hace / cómo lo hace (completar antes de empezar)

- **Qué:** <!-- resultado observable en una frase -->
- **Cómo:** <!-- enfoque, piezas que se tocan -->

## Especificación incompleta — definición mínima

<!-- Si el issue no trae payload/modelo, se define aquí ANTES de codear.
     Solo lo que el criterio de aceptación necesita. Ver AGENTS.md §5.1. -->

- **Datos mínimos:** <!-- campos imprescindibles, sin extras -->
- **Estados / enums:** <!-- del flujo del MVP, sin añadidos -->
- **Payload / contrato:** <!-- forma mínima; actualizar openapi.yaml en el PR -->
- **Errores:** <!-- 400 / 403 / 404 / 409 / 500 según aplique -->

## Dependencias

- **Hard:** <!-- issue que debe estar mergeado, o "ninguna" -->
- **Soft (mock hasta que exista):** <!-- tarea, o "ninguna" -->

## Rama sugerida

`<prefijo>/<ID>-<slug>`

---
name: Tarea
about: Tarea pequeña (≤ 1 día, 1 PR) con caso de uso y criterio de aceptación
title: "C7 · Alternar cámara durante la visita"
labels: "fase-1, frontend"
assignees: ""
---

> **Publicado como [#46](https://github.com/femCodersClub-vonage-program/homefix-connect/issues/46).**
> La spec completa está en `specs/features/C7-camera-switch/02-specification.md`.
> **Cambio de alcance (27/11/2026):** C7 entra en el MVP base; antes estaba en
> `docs/MVP_EXTENDED.md` como fuera de alcance.

## Caso de uso (fijo)

Escenario 1: la inquilina entra a la videollamada y ve su vídeo local
(`docs/MVP_DEFINITION.md:53`). Escenario 2: la técnica evalúa la avería en la
llamada y ambas se ven (`docs/MVP_DEFINITION.md:67`, `:31`). Se añade el
escenario 5 de `docs/MVP_DEFINITION.md`: alternar cámara durante la visita sin
terminar la sesión.

## Criterio de aceptación (fijo, conductual)

- [ ] Aparece un botón "Alternar cámara" junto al vídeo local cuando la llamada
      está `connected`.
- [ ] Al pulsarlo se llama una vez a `publisher.cycleVideo()` sobre el publisher
      activo; no se crea otro publisher ni se cierra la sesión.
- [ ] La sesión, el token, el vídeo remoto, el texto de estado y el botón siguen
      iguales después del cambio (no se puede afirmar qué cámara quedó activa).
- [ ] Si `cycleVideo()` falla o no hay otra cámara, no se muestra error, no
      cambia el texto y la llamada continúa.
- [ ] Un segundo clic mientras el cambio está en curso se ignora.
- [ ] Al desmontar se destruye solo el publisher activo; no queda cámara
      encendida.
- [ ] Tests con SDK mockeado: sin cámara ni red reales.
- [ ] `pnpm check` y `pnpm test` en verde.

## Qué hace / cómo lo hace (completado antes de empezar)

- **Qué:** la inquilina puede enseñar la incidencia con otra cámara desde la
  propia videollamada, sin colgar ni perder a la otra persona.
- **Cómo:** añade `switchCamera()` a `useVideoCall` y un botón en `VideoCall`;
  llama a `Publisher.cycleVideo()` del SDK 2.36.0. No se recrea el publisher:
  eso dispara `streamDestroyed` en la otra pestaña y colgaría al par. Sin tocar
  backend, contrato ni base de datos.

## Especificación incompleta — definición mínima

- **Datos mínimos:** ninguno nuevo. No se añade `cameraFacing` ni enum: la UI no
  puede afirmar si la cámara activa es frontal o trasera. Primer publisher sin
  `facingMode`, decide el navegador.
- **Estados / enums:** se mantienen `idle | connecting | connected | error |
  ended`. No se añaden estados.
- **Payload / contrato:** ninguno. No requiere `backend/openapi.yaml` ni
  `schema.prisma`.
- **Errores:** no aplican códigos HTTP. Fallo de cámara = no bloqueante, sin
  aviso y sin cambio de `status` (decisión acordada).

## Decisiones de refinamiento acordadas

1. C7 entra en el MVP base; el cambio de alcance se hace primero en un PR de
   docs/spec aprobado (`docs/C7-mvp-scope`).
2. Se usa `cycleVideo()` y se descarta recrear el publisher con `facingMode`
   porque colgaría a la otra participante.
3. Botón con texto fijo "Alternar cámara" dentro de `VideoCall`, junto al vídeo
   local; deshabilitado fuera de `connected`.
4. Cámara inicial la del navegador; sin lógica por rol ni detección de móvil.
5. Fallo silencioso: se mantiene la cámara actual y la llamada continúa.
6. En escritorio con una sola cámara puede no haber cambio visible: limitación
   documentada, no bloqueante.

## Dependencias

- **Hard:** C3 y C4 mergeados en `main` (ya cumplidos); PR de docs/spec aprobado.
- **Soft (mock hasta que exista):** SDK de Vonage Video en tests; cámara real
  solo para la demo manual.

## Rama sugerida

`feat/C7-camera-switch` (desde la rama de docs una vez aprobada, o desde `main`
tras mergear el PR de alcance).

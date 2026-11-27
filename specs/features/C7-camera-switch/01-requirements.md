# 01 — Requirements · C7 · Alternar cámara durante la visita

> **ID:** C7 · **Estado:** clarificado; **incorporado al MVP el 27/11/2026**.
> **Issue:** https://github.com/femCodersClub-vonage-program/homefix-connect/issues/46
> **Rama de docs/spec:** `docs/C7-mvp-scope` · **Rama de código:** `feat/C7-camera-switch`
> **Origen:** hallazgo al probar C4 en móvil: se abre siempre la cámara frontal
> y no hay forma de mostrar la incidencia con la trasera. El 27/11 se decidió
> sacarla del alcance extendido y meterla en el MVP base.

---

## 1. Resumen del Problema

En móvil, el SDK abre la cámara por defecto (frontal). La inquilina necesita
poder enseñar la avería con la cámara trasera durante la videollamada. Hoy no
existe ningún control para cambiarla: `publisherOptions` en
`frontend/src/hooks/useVideoCall.ts` solo fija `insertMode`, tamaño,
`publishAudio` y `publishVideo`; no hay selección de cámara ni botón asociado.

Valor observable: desde la propia pantalla de vídeo se puede alternar entre las
cámaras disponibles sin colgar, sin perder a la otra persona y sin dejar la
cámara encendida al salir.

**Riesgo detectado antes de especificar:** la propuesta inicial recreaba el
`Publisher` con `facingMode`. Eso dispara `streamDestroyed` en la otra pestaña;
`handleRemoteGone()` (`useVideoCall.ts:219`) interpreta ese evento como fin de
llamada y cuelga al par. Por eso C7 estaba fuera del MVP y por eso se cambia el
enfoque a `Publisher.cycleVideo()`.

---

## 2. Casos de Uso Afectados

- `docs/MVP_DEFINITION.md:53` — Escenario 1: la inquilina entra a la
  videollamada y ve su vídeo local.
- `docs/MVP_DEFINITION.md:67` — Escenario 2: la técnica evalúa la avería y ambas
  personas se ven.
- `docs/MVP_DEFINITION.md:31` — la técnica evalúa la avería en la llamada;
  enseñarla con otra cámara es el soporte mínimo de esa evaluación.
- Nuevo escenario 5 en `docs/MVP_DEFINITION.md`: alternar cámara durante la
  visita sin terminar la sesión.

No se crea un caso de uso de negocio nuevo: se completa la inspección visual de
la avería dentro del caso de uso existente.

---

## 3. Comportamiento Actual vs Esperado

| Actual | Esperado |
|---|---|
| `OT.initPublisher` usa la cámara que elija el navegador (frontal en móvil). | Existe un control explícito para alternar entre las cámaras disponibles. |
| No se puede mostrar la incidencia con otra cámara sin salir y reentrar. | El cambio ocurre dentro de la llamada activa, sin republicar ni cambiar `status`. |
| El cleanup destruye un solo publisher (`useVideoCall.ts:88`). | Sigue destruyendo solo ese publisher: no se crea un segundo. |
| Tests mockean el SDK y no abren cámara (`VideoCall.test.tsx`). | Se añade un test que mockea `publisher.cycleVideo()`, sin cámara ni red real. |
| C7 figuraba como fuera de alcance en `docs/MVP_EXTENDED.md`. | C7 pasa al MVP base y el issue #46 deja de estar fuera de alcance. |

---

## 4. Fuera de Alcance (Out of Scope)

- Recrear el `Publisher`, cambiar `facingMode` ni llamar a `session.unpublish()`.
- Selector libre de dispositivos (`enumerateDevices` con lista de cámaras).
- Cambio automático por rol (inquilina → trasera, técnica → frontal).
- Etiqueta que afirme qué cámara está activa: el SDK solo expone "siguiente
  dispositivo", no garantiza frontal/trasera en escritorio.
- Guardar la preferencia entre sesiones o en `localStorage`.
- Grabación, filtros, flash, zoom, rotación forzada.
- Reconexión automática, timeout visual ni cambios en `streamCreated`/
  `streamDestroyed` (ya resueltos en C4).
- Cambios en `backend/openapi.yaml`, `schema.prisma`, tokens ni webhooks.
- Añadir dependencias o librerías de UI.

---

## 5. Dependencias

- **Hard:**
  - C3 y C4 ya mergeados en `main`.
  - PR de docs/spec de alcance aprobado antes del PR de código.
- **Soft (mock hasta que exista):** SDK de Vonage Video en tests. El dispositivo
  real con dos cámaras solo se usa en la demo manual; si no existe, el cambio
  falla en silencio.

---

## 6. Clasificación de Requisitos

### Explícitos

- La usuaria pidió meter C7 en el MVP (27/11/2026).
- La inquilina debe poder mostrar la incidencia con otra cámara durante la
  videollamada.
- El cambio de alcance se refleja primero en un PR de docs/spec.

### Derivados (con justificación)

- El control vive en la pantalla de vídeo: es donde ocurre la acción y evita
  tocar `IncidentDetail` ni el contrato.
- Se usa `Publisher.cycleVideo()` (`opentok.d.ts:531`): cambia de dispositivo
  dentro del mismo publisher, por lo que no dispara `streamDestroyed` en el par.
- El botón dice "Alternar cámara": es la única afirmación verdadera sin consultar
  `getSettings()` ni `enumerateDevices`.
- El cambio no debe alterar `status` a `connecting`: la sesión ya está conectada.
- Tests con SDK mockeado: regla fija de `frontend/AGENTS.md` §5.

### Desconocidos

- Ninguno bloqueante. Queda documentado como limitación aceptada que, en equipos
  con una sola cámara, `cycleVideo()` puede resolver sin cambio visible o
  rechazarse; en ambos casos la llamada sigue igual y no se muestra aviso.

---

## 7. Decisiones de Clarificación Acordadas

1. **Alcance:** C7 entra en el MVP base. Se actualizan `MVP_DEFINITION.md`,
   `TASKS.md`, `PROJECT_STATUS.md` y `MVP_EXTENDED.md` en un PR de docs/spec
   previo al de código.
2. **Enfoque:** `publisher.cycleVideo()`. Se descarta recrear el publisher con
   `facingMode` porque colgaría a la otra participante.
3. **Control:** botón "Alternar cámara" dentro de `VideoCall`, junto al vídeo
   local, habilitado solo cuando `status === 'connected'`.
4. **Cámara inicial:** la que elija el navegador. No hay lógica por rol ni
   arranque automático en trasera.
5. **Fallo:** si `cycleVideo()` rechaza (sin cámara, permiso denegado o error),
   no se muestra aviso, no cambia el texto ni el `status`, y la llamada continúa.
6. **Estado interno:** no se añade `cameraFacing` ni un enum nuevo; el SDK no
   permite afirmar de forma fiable qué cámara quedó activa.
7. **GitHub:** autorizado editar el issue #46 y moverlo a Ready; no autorizado
   hacer push ni abrir PR sin confirmación posterior.
8. **Orden:** preparar docs/spec y plan en local; parar para aprobación antes de
   escribir código.

Estas decisiones cierran la clarificación (`sdd-03`). Se puede pasar a la
especificación técnica.

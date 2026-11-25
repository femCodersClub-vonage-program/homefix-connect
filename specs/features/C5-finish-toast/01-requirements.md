# 01 — Requirements · C5 · Toast "Visita finalizada"

> **Issue:** [#21](https://github.com/femCodersClub-vonage-program/homefix-connect/issues/21)
> **Rama sugerida:** `feat/C5-finish-toast` · **Size:** XS
> **Fuente de alcance:** `docs/MVP_DEFINITION.md` escenario 4 · `docs/TASKS.md` §7 · issue #21
> **Estado:** análisis y decisiones acordadas el 2026-11-24; refinamiento publicado en [#21](https://github.com/femCodersClub-vonage-program/homefix-connect/issues/21).

---

## 1. Resumen del Problema

El backend ya puede marcar una incidencia como `VIDEO_COMPLETED` cuando termina
la videollamada, y el botón de entrada ya se deshabilita con el texto
"Visita realizada". Falta el feedback visible que cierre el caso de uso: que el
frontend avise de que la visita terminó y de que las notificaciones se enviaron.

**Valor observable:** cuando `IncidentDetail` detecta que `incident.status` pasa
a `VIDEO_COMPLETED`, aparece el aviso `"Visita finalizada. Notificaciones
enviadas a gestora e inquilina."` y no se puede volver a entrar a la llamada.

**Consumidor:** inquilina y técnica en la pantalla de detalle de la incidencia.
La gestora no entra a la videollamada.

---

## 2. Casos de Uso Afectados

| Escenario | Relación con C5 |
|---|---|
| **3 — Fin de la videollamada → 2 SMS** | C5 solo refleja el resultado; no envía SMS ni cambia estados en backend. |
| **4 — Frontend avisa de que la visita terminó** | Es el caso de uso que cierra C5: aviso visible + botón deshabilitado. |
| **1/2 — Entrar a la videollamada** | C5 no cambia la entrada; solo bloquea el botón cuando la visita ya terminó (comportamiento ya presente en C2). |

---

## 3. Comportamiento Actual vs Esperado

### Hoy

- `IncidentDetail` obtiene la incidencia con `useIncident` (`useQuery`, clave
  `['incident', incidentId]`).
- Muestra el estado con la etiqueta `VIDEO_COMPLETED` → "Vídeo completado".
- `JoinButton` ya calcula `canJoin = incidentStatus === 'VISIT_ASSIGNED' && visitStatus === 'CONFIRMED'`.
- Si `incidentStatus === 'VIDEO_COMPLETED'`, `JoinButton` ya muestra
  "Visita realizada" deshabilitado.
- No hay componente de toast, aviso de fin de visita ni lógica que reaccione al
  cambio de `status`.
- No hay `refetchInterval` propio; `useIncident` usa los valores por defecto de
  TanStack Query (`refetchOnWindowFocus`, `refetchOnReconnect`).

### Esperado tras C5

- Al detectar la transición a `VIDEO_COMPLETED`, se muestra exactamente el texto
  `"Visita finalizada. Notificaciones enviadas a gestora e inquilina."`.
- El aviso es accesible (`role="status"` / `aria-live="polite"`).
- El botón sigue deshabilitado con "Visita realizada"; C5 no reimplementa esa
  regla.
- El mecanismo de detección y la persistencia del aviso quedan fijados en las
  decisiones de clarificación.

---

## 4. Fuera de Alcance

- Enviar SMS o cambiar `Incident.status` / `VideoSession.status` en backend.
- Añadir WebSocket, SSE o cualquier tecnología de push nueva.
- Cambiar `backend/openapi.yaml` ni `backend/prisma/schema.prisma`.
- Añadir una librería de toast sin ADR y PR aprobado.
- Mostrar teléfonos, tokens ni mensajes de error del SDK en el aviso.
- Reconectar a la videollamada ni permitir entrar de nuevo.
- Tests de contrato Pact ni E2E Playwright.

---

## 5. Dependencias

### Hard

- **C1** · Cliente API generado. ✅ Mergeado.
- **C2** · `IncidentDetail` y `JoinButton` con el estado "Visita realizada". ✅ Mergeado.

### Soft

- **A4/B3** · Webhook `session.end` que marca la incidencia como
  `VIDEO_COMPLETED`. Puede mockearse con la query/fixture; no bloquea C5.
- **C4** · Cierre visual de la videollamada ("Desconectada"). Ya mergeado, pero
  C5 no depende de él para detectar el estado de la incidencia.

---

## 6. Requisitos Clasificados

### Explícitos

| ID | Requisito | Fuente |
|----|-----------|--------|
| E-01 | Detectar el cambio de `status` a `VIDEO_COMPLETED` | issue #21 · `MVP_DEFINITION.md` escenario 4 |
| E-02 | Mostrar `"Visita finalizada. Notificaciones enviadas a gestora e inquilina."` | issue #21 · `MVP_DEFINITION.md` escenario 4 |
| E-03 | Botón deshabilitado con texto "Visita realizada" | issue #21 · `MVP_DEFINITION.md` escenario 4 |
| E-04 | Test con mock de TanStack Query del cambio de estado | issue #21 |

### Derivados

| ID | Requisito | Justificación |
|----|-----------|---------------|
| D-01 | El aviso debe tener `aria-live="polite"` | `frontend/AGENTS.md` §6 exige accesibilidad para toasts. |
| D-02 | La detección debe vivir en un hook o en `IncidentDetail`, no en `JoinButton` | `frontend/AGENTS.md` §3: la página compone, el componente solo renderiza. |
| D-03 | Reutilizar `JoinButton` sin cambiar su contrato | C2 ya cumple E-03; C5 no debe duplicar la regla. |
| D-04 | Los tests usan la fixture `makeIncidentFixture` y mockean `fetch`/Query | Patrón existente en `IncidentDetail.test.tsx`. |

### Desconocidos (bloqueantes)

| ID | Pregunta | Por qué importa |
|----|----------|-----------------|
| U-01 | ¿Componente propio o librería `react-hot-toast`? | Añadir dependencia exige ADR y PR aprobado; afecta al diseño y al plan. |
| U-02 | ¿Auto-dismiss a los 5 s o persistente hasta cerrar? | Define estado, temporizadores y tests. |
| U-03 | ¿Cómo se detecta el cambio si la pestaña está abierta? | `useIncident` no tiene polling; sin una regla, el aviso puede no aparecer en la demo. |
| U-04 | ¿Mostrar el aviso si la página se abre ya en `VIDEO_COMPLETED`? | El escenario dice "pasa a", no "está en"; evita mostrar un aviso al cargar una visita antigua. |

---

## 7. Decisiones de Clarificación Acordadas

| # | Decisión | Justificación |
|---|----------|---------------|
| U-01 | Componente propio `FinishToast`, sin nueva dependencia. | `AGENTS.md` prohíbe añadir librerías sin ADR/PR aprobado; el aviso es un `<p>` con `role="status"`. |
| U-02 | Auto-dismiss a los **5 s**; sin botón de cierre. | Suficiente para una confirmación; evita estado y UI extra. |
| U-03 | `useIncident` hace polling cada **5 s** mientras `status !== 'VIDEO_COMPLETED'` y se detiene al completarse. | Sin polling el aviso no aparecería en la demo si nadie cambia de pestaña; es la opción mínima con TanStack Query. |
| U-04 | El toast aparece **solo en la transición** a `VIDEO_COMPLETED`; si la página se abre ya completada, no aparece. | Coincide con "cuando pasa a" y evita avisos al recargar visitas antiguas. |

Acordadas por Carolina el 2026-11-24 y publicadas como [comentario en el issue #21](https://github.com/femCodersClub-vonage-program/homefix-connect/issues/21#issuecomment-7133212296).

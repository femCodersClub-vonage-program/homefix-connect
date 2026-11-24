# 02 — Specification · C5 · Toast "Visita finalizada"

> **Issue:** [#21](https://github.com/femCodersClub-vonage-program/homefix-connect/issues/21)
> **Rama:** `feat/C5-finish-toast` · **Size:** XS · **Closes #21**
> **Base:** `01-requirements.md` · `docs/MVP_DEFINITION.md` escenario 4 · `frontend/AGENTS.md`
> **Estado:** especificación cerrada y plan aprobado el 2026-11-24.

---

## 1. Resumen y Contexto

Cuando el backend termina la videollamada, marca la incidencia como
`VIDEO_COMPLETED`. La pantalla `IncidentDetail` ya deshabilita el botón de
entrada con el texto "Visita realizada", pero no informa de que la visita
terminó ni de que los SMS se enviaron.

**Objetivo observable:** si la incidencia abierta pasa de cualquier estado a
`VIDEO_COMPLETED`, aparece durante 5 segundos el aviso exacto
`"Visita finalizada. Notificaciones enviadas a gestora e inquilina."`.

---

## 2. Alcance

### Dentro

- Polling cada 5 s en `useIncident` mientras `status !== 'VIDEO_COMPLETED'`.
- Detección de la transición a `VIDEO_COMPLETED` en un hook propio.
- Componente `FinishToast` con `role="status"` y `aria-live="polite"`.
- Auto-dismiss a los 5 s.
- Test del cambio de estado con TanStack Query mockeada en `IncidentDetail.test.tsx`.
- Test unitario del componente.
- CSS mínimo para el aviso y actualización de `frontend/AGENTS.md`.

### Fuera

- Enviar SMS, cerrar la sesión de vídeo ni cambiar estados en backend.
- Mostrar el toast si la incidencia ya llega completada en la carga inicial.
- Botón de cierre manual del toast.
- Nueva dependencia, librería de UI, router, estado global o push (WS/SSE).
- Cambios en `backend/openapi.yaml`, `backend/prisma/schema.prisma` ni `pnpm-lock.yaml`.
- Tests Pact ni Playwright.

---

## 3. Casos de Uso

1. La inquilina o la técnica están en `IncidentDetail` con la incidencia en
   `VISIT_ASSIGNED`.
2. El backend recibe `session.end`, marca `VIDEO_COMPLETED` y envía los SMS.
3. El polling de `useIncident` obtiene el nuevo estado.
4. El hook detecta la transición y muestra el aviso.
5. A los 5 s el aviso desaparece; el botón permanece deshabilitado como
   "Visita realizada".

---

## 4. Requisitos Funcionales

- **RF-01.** `useIncident` consulta cada 5 s mientras `data.status !== 'VIDEO_COMPLETED'`.
- **RF-02.** Cuando `data.status === 'VIDEO_COMPLETED'`, el polling se detiene.
- **RF-03.** `useFinishToast(status)` devuelve `true` solo cuando `status` pasa a
  `VIDEO_COMPLETED` desde otro estado conocido.
- **RF-04.** Si `status` es `undefined` en la primera renderización (carga), no
  se muestra el toast.
- **RF-05.** Si la primera respuesta ya trae `VIDEO_COMPLETED`, no se muestra el
  toast.
- **RF-06.** El toast se oculta automáticamente 5 s después de mostrarse.
- **RF-07.** `FinishToast` no renderiza nada cuando `open === false`.
- **RF-08.** El texto exacto es
  `"Visita finalizada. Notificaciones enviadas a gestora e inquilina."`.
- **RF-09.** El aviso tiene `role="status"` y `aria-live="polite"`.
- **RF-10.** `JoinButton` conserva su contrato y su regla actual; C5 no la
  modifica.
- **RF-11.** El cleanup del temporizador se ejecuta si el componente se desmonta
  antes de los 5 s o si `status` deja de ser `VIDEO_COMPLETED`.

---

## 5. Reglas de Negocio

- **RN-01.** Solo existe un toast a la vez; refetches repetidos con el mismo
  `status` no lo reabren.
- **RN-02.** El aviso no es un error: usa `role="status"`, no `role="alert"`.
- **RN-03.** No se muestra ningún dato personal, teléfono, token ni mensaje del
  SDK en el aviso.
- **RN-04.** El estado del toast es solo de UI; no se persiste en URL,
  `localStorage` ni React Query.
- **RN-05.** El botón sigue bloqueado porque C2 ya define
  `canJoin = VISIT_ASSIGNED && CONFIRMED`; C5 no relaja esa regla.

---

## 6. Contrato de Entrada

No hay nuevo contrato HTTP. Entradas internas:

| Nombre | Tipo | Origen | Requerido | Validación |
|---|---|---|---|---|
| `incidentId` | `string` | Prop de `IncidentDetail` / query string | Sí | Ya validado en C1/C2. |
| `status` | `IncidentStatus \| undefined` | `incident.data?.status` | No durante la carga | Enum generado: `REPORTED`, `VISIT_ASSIGNED`, `VIDEO_COMPLETED`, `CLOSED`. |
| `open` | `boolean` | Resultado de `useFinishToast` | Sí | `true` muestra el toast; `false` no renderiza nada. |

`IncidentStatus` se importa desde `../api/incidents.js` (tipos generados). No se
escribe un enum nuevo a mano.

---

## 7. Contrato de Salida

No hay salida HTTP nueva. Salida observable en el DOM:

| Situación | DOM esperado |
|---|---|
| Transición a `VIDEO_COMPLETED` | `<p role="status" aria-live="polite">Visita finalizada. Notificaciones enviadas a gestora e inquilina.</p>` |
| 5 s después | El `<p>` desaparece. |
| Carga inicial completada | No existe el `<p>` del toast. |
| `open === false` | `FinishToast` devuelve `null`. |

El botón sigue siendo `<button disabled>Visita realizada</button>` cuando
`status === 'VIDEO_COMPLETED'`.

---

## 8. Manejo de Errores

No se introducen nuevos códigos HTTP ni mensajes de error.

| Situación | Comportamiento |
|---|---|
| Fallo en un refetch de `useIncident` | TanStack Query mantiene el último dato válido; el toast no cambia. La UI de error existente no se sustituye por el toast. |
| `status` cambia a `undefined` tras error sin datos | El toast se oculta; no se muestra error del SDK. |
| Desmontaje antes de 5 s | `clearTimeout` evita actualizar un componente desmontado. |
| `status` deja de ser `VIDEO_COMPLETED` | Se cancela el temporizador y se oculta el toast. |

---

## 9. Casos Límite

- Carga inicial con `VIDEO_COMPLETED`: sin toast (U-04).
- Primer dato `VISIT_ASSIGNED` y segundo `VIDEO_COMPLETED`: toast visible.
- Tres refetches seguidos con `VIDEO_COMPLETED`: un solo toast, no se reinicia
  el temporizador.
- `VIDEO_COMPLETED` → `CLOSED` antes de 5 s: toast oculto y temporizador
  cancelado.
- `CLOSED` → `VIDEO_COMPLETED`: se muestra de nuevo porque es una transición
  real a completado.
- StrictMode: el doble efecto no deja dos temporizadores vivos.
- Cambio de rol mientras hay llamada: no afecta al toast; el selector sigue
  bloqueado por C3/C4.

---

## 10. Criterios de Aceptación

1. **Aviso en la transición**
   Given `IncidentDetail` está abierto con `VISIT_ASSIGNED`
   When una refetch devuelve `VIDEO_COMPLETED`
   Then aparece el texto exacto del aviso con `role="status"`.

2. **Sin aviso en carga inicial**
   Given la primera respuesta de la API ya trae `VIDEO_COMPLETED`
   When se renderiza `IncidentDetail`
   Then no aparece el toast.

3. **Auto-dismiss**
   Given el toast acaba de aparecer
   When pasan 5 s
   Then el aviso desaparece.

4. **Sin duplicados**
   Given el toast está visible
   When llegan más refetchs con el mismo `status`
   Then no se crea un segundo aviso ni se reinicia el temporizador.

5. **Accesibilidad**
   Given el aviso visible
   Then tiene `role="status"` y `aria-live="polite"`.

6. **Botón intacto**
   Given `VIDEO_COMPLETED`
   Then el botón sigue deshabilitado con "Visita realizada".

7. **Polling**
   Given una incidencia no completada
   When pasan 5 s
   Then `useIncident` vuelve a consultar `/api/incidents/:id`.

8. **Aislamiento**
   Given la suite de C5
   Then no se abren conexiones reales ni se usa `react-hot-toast`.

---

## 11. Diseño Técnico

### Ficheros

```text
frontend/src/
├── hooks/useIncident.ts          # MODIFY: refetchInterval de 5 s hasta completar
├── hooks/useFinishToast.ts       # NEW: detecta transición y temporizador
├── components/FinishToast.tsx    # NEW: aviso accesible
├── components/FinishToast.test.tsx # NEW: tests del componente
├── pages/IncidentDetail.tsx      # MODIFY: usar hook + renderizar toast
├── pages/IncidentDetail.test.tsx # MODIFY: tests de transición y polling
├── index.css                     # MODIFY: estilos .toast
└── AGENTS.md                     # MODIFY: mapa y nota C5
```

Sin cambios en backend, `openapi.yaml`, `schema.prisma` ni `pnpm-lock.yaml`.

### Hook `useFinishToast`

Firma:

```ts
export function useFinishToast(
  status: IncidentStatus | undefined,
): boolean;
```

Estado local: `visible: boolean`. Referencia local: `previousStatus` con el
último `status` visto. El efecto se ejecuta solo cuando cambia `status`:

1. Guarda el `previousStatus` y actualiza la referencia.
2. Si `status !== 'VIDEO_COMPLETED'`, oculta y no crea temporizador.
3. Si `previousStatus` es `undefined` o ya era `VIDEO_COMPLETED`, no muestra.
4. En caso contrario, muestra y programa `setTimeout(..., 5000)`.
5. El cleanup cancela el temporizador.

Se llama al hook antes de los early returns de `IncidentDetail`, con
`incident.data?.status`, para cumplir las reglas de hooks.

### Componente `FinishToast`

Firma:

```ts
export const FINISH_TOAST_MESSAGE =
  'Visita finalizada. Notificaciones enviadas a gestora e inquilina.';

export function FinishToast({ open }: { open: boolean }): ReactNode;
```

Devuelve `null` si `open === false`; si no, un `<p className="toast" role="status"
aria-live="polite">` con el mensaje exacto.

### CSS

`.toast`: posición fija arriba a la derecha, fondo oscuro, texto claro,
pequeño padding y `border-radius`; sin librería ni animación compleja.

---

## 12. Estrategia de Pruebas

### Unitarias

- `FinishToast.test.tsx`: renderiza el mensaje exacto cuando `open === true`,
  con `role="status"` y `aria-live="polite"`; no renderiza nada cuando `false`.
- `IncidentDetail.test.tsx`: usa `QueryClientProvider` con un `QueryClient`
  accesible y un `fetchMock` que devuelve primero `VISIT_ASSIGNED` y luego
  `VIDEO_COMPLETED`; llama a `refetchQueries` y usa temporizadores falsos.
- `IncidentDetail.test.tsx`: verifica que no aparece toast si la primera
  respuesta ya es `VIDEO_COMPLETED`.
- `IncidentDetail.test.tsx`: verifica el auto-dismiss a los 5 s.
- `IncidentDetail.test.tsx`: verifica que el botón sigue deshabilitado con
  "Visita realizada".

### Aislamiento

- `vi.stubGlobal('fetch', ...)` con respuestas controladas; sin backend real.
- `vi.useFakeTimers()` / `vi.useRealTimers()` en los tests de temporización.
- Sin snapshots, sin red y sin SDK de Vonage.

### Verificación

```bash
pnpm --filter frontend test
pnpm check
pnpm test
pnpm build
```

---

## 13. Dependencias

- **C1** y **C2** ✅ mergeadas.
- **A4/B3** proporcionarán el cambio real de estado; se mockea en tests.
- Stack fijado: React 19, TanStack Query 5, Vitest + Testing Library, CSS plano.
- Sin dependencias nuevas.

---

## 14. Preguntas Abiertas y Suposiciones

No quedan preguntas bloqueantes. Suposiciones aprobadas:

- Polling de 5 s es aceptable en el MVP para que la demo funcione sin cambiar
  de pestaña.
- El toast no se guarda ni se rehydrata; solo reacciona a transiciones vistas
  mientras la página está montada.
- `VIDEO_COMPLETED` sigue siendo el único estado que dispara el aviso; `CLOSED`
  no.
- Las decisiones U-01 a U-04 están publicadas en el issue #21.

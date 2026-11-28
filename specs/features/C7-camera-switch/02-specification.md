# 02 — Especificación Técnica · C7 · Alternar cámara durante la visita

> **ID:** C7 · **Issue:** [#46](https://github.com/femCodersClub-vonage-program/homefix-connect/issues/46)
> **Ramas:** `docs/C7-mvp-scope` (alcance) → `feat/C7-camera-switch` (código)
> **Fuentes:** `01-requirements.md`, `docs/MVP_DEFINITION.md:53`, `:67`.
> **SDK fijado:** `@vonage/client-sdk-video@2.36.0` (`opentok.d.ts:531`).

---

## 1. Resumen y Contexto

Añadir un botón en la pantalla de vídeo que permita alternar entre las cámaras
disponibles durante la videollamada, sin colgar y sin cambiar de sesión. El
cambio se aplica con `Publisher.cycleVideo()`, que sustituye la fuente de vídeo
**dentro del mismo publisher**. No se recrea el publisher: hacerlo dispara
`streamDestroyed` en la otra pestaña y `handleRemoteGone()` termina su llamada.

No hay cambio de API, BD ni contrato HTTP: todo ocurre en el frontend.

---

## 2. Alcance (Scope)

### In-scope

- Botón "Alternar cámara" en `VideoCall`, junto al vídeo local.
- `switchCamera()` expuesto por `useVideoCall`.
- Llamada a `publisher.cycleVideo()` sobre el publisher activo.
- Regla de fallo silencioso: sin aviso, sin cambio de texto y sin cambio de `status`.
- Tests unitarios con SDK mockeado.
- Actualización de docs de MVP para reflejar que C7 ya no está fuera de alcance.

### Out-of-scope

- Recrear el publisher, `facingMode`, `unpublish()` ni un segundo `initPublisher`.
- Lista de dispositivos, `enumerateDevices`, `getSettings()`, persistencia, roles
  ni detección de móvil/escritorio.
- Etiquetas "cámara frontal"/"cámara trasera": no se puede afirmar cuál quedó activa.
- Cambios en `status` distintos de los ya definidos
  (`idle | connecting | connected | error | ended`).
- Reconexión, stream remoto, webhooks, SMS, `openapi.yaml` ni Prisma.
- Nuevas dependencias.

---

## 3. Casos de Uso

1. La inquilina entra a la llamada (`MVP_DEFINITION.md:53`) y ve su vídeo local.
2. Pulsa "Alternar cámara" para enseñar la avería con otra cámara.
3. La técnica sigue viendo el mismo stream remoto (`MVP_DEFINITION.md:67`).
4. Puede volver a pulsar para ciclar a la siguiente cámara disponible.
5. Si no hay otra cámara, la visita continúa sin cambios visibles.

---

## 4. Requisitos Funcionales (RF)

- **RF-01.** El botón se renderiza siempre que `VideoCall` esté montada.
- **RF-02.** El texto y el `aria-label` son exactamente `Alternar cámara`.
- **RF-03.** El botón está deshabilitado cuando `status !== 'connected'`.
- **RF-04.** El primer publisher se crea con las opciones actuales: sin
  `facingMode` ni `videoSource` nuevos.
- **RF-05.** Al pulsar, se invoca `cycleVideo()` exactamente una vez sobre el
  publisher activo.
- **RF-06.** No se crea ni se publica otro publisher; no se llama a
  `session.unpublish()`, `OT.initSession()` ni `session.connect()`.
- **RF-07.** Si `cycleVideo()` resuelve, no cambia `status`, `remoteConnected`,
  el texto del botón ni aparece aviso alguno.
- **RF-08.** Si `cycleVideo()` rechaza, se ignora el error: sin aviso, sin
  reintento y sin cambio de `status` o de texto.
- **RF-09.** Si hay un cambio en curso, un segundo clic se ignora.
- **RF-10.** El cleanup final destruye únicamente el publisher activo.
- **RF-11.** Los tests no abren cámara ni red: se mockea `OT.initPublisher` y
  `publisher.cycleVideo`.

---

## 5. Reglas de Negocio (RN)

- **RN-01.** No existe cambio automático por rol ni cámara inicial forzada.
- **RN-02.** No se añade estado persistido ni enviado al backend.
- **RN-03.** La UI no afirma qué cámara está activa; solo ofrece ciclar.
- **RN-04.** Un cambio fallido nunca termina la llamada: es no bloqueante.
- **RN-05.** No se consulta UA, viewport ni lista de dispositivos.

---

## 6. Contrato de Entrada (Input Contract)

No hay HTTP. Contrato interno:

| Nombre | Tipo | Requerido | Valor inicial | Validación |
|---|---|---|---|---|
| `switchCamera` | `() => void` | Sí (hook) | — | Sin argumentos; resuelve el `Promise` internamente. |
| `status` | `VideoCallStatus` | Ya existente | `'idle'` | Botón deshabilitado si no es `'connected'`. |

No se añaden parámetros a `VideoCall` ni a `useVideoCall`. `publisherOptions`
se mantiene intacto.

---

## 7. Contrato de Salida (Output Contract)

No hay JSON ni códigos HTTP. Salida observable:

- `VideoCallResult` pasa a:
  ```ts
  { status, remoteConnected, hangup, switchCamera }
  ```
- El DOM muestra el botón `Alternar cámara` con `aria-label` igual al texto.
- El stream remoto, el texto de estado y los SMS permanecen invisibles a este
  cambio.

---

## 8. Manejo de Errores (Error Handling)

No aplican `400/403/404/409/500`: no hay endpoint.

| Situación | Comportamiento |
|---|---|
| `cycleVideo()` rechaza por no haber otra cámara | Sin aviso; `status` sigue `connected`; texto sin cambios. |
| Permiso de cámara denegado | Ya cubierto por C3 con `status: 'error'`; el botón está deshabilitado. |
| Doble clic rápido | Se ignora el segundo mientras la primera promesa está pendiente. |
| Desmontaje durante el cambio | El cleanup gana: se destruye el publisher y no se actualiza estado. |

---

## 9. Casos Límite (Edge Cases)

- **Escritorio con una sola cámara:** botón visible; si `cycleVideo()` resuelve
  con el mismo dispositivo o rechaza, no cambia nada visible (RN-04).
- **Cambio durante desmontaje:** la promesa puede resolverse tarde; se comprueba
  `disposed`/`cleaned` antes de cualquier acción.
- **Cambio mientras el remoto habla:** no se unsubscribe ni se toca
  `remoteStreamId`.
- **Publisher aún no publicado:** el botón está deshabilitado porque `status`
  todavía no es `connected`.
- **Sin permiso inicial:** C3 ya dejó la llamada en `error`; C7 no la reanuda.

---

## 10. Criterios de Aceptación (Acceptance Criteria)

- **AC-01.** Given una llamada `connected`, When se pulsa "Alternar cámara",
  Then se llama una vez a `publisher.cycleVideo()` y no se crea otro publisher.
- **AC-02.** Given una llamada `connected`, When `cycleVideo()` resuelve, Then
  `status` sigue `connected`, `remoteConnected` no cambia y el botón sigue
  diciendo "Alternar cámara".
- **AC-03.** Given `cycleVideo()` rechaza, When se pulsa, Then no se muestra
  error, no cambia el texto y la llamada continúa.
- **AC-04.** Given `status !== 'connected'`, When se intenta pulsar, Then no se
  llama a `cycleVideo()` y el botón está deshabilitado.
- **AC-05.** Given un cambio en curso, When se pulsa de nuevo, Then
  `cycleVideo()` sigue teniendo una sola llamada.
- **AC-06.** Given un desmontaje durante el cambio, When termina el cleanup,
  Then solo se destruye el publisher activo, una vez.
- **AC-07.** Given la suite de tests, When se ejecuta, Then no se accede a
  cámara ni red reales, `pnpm check`/`pnpm test` están en verde y no hay
  dependencias nuevas.

---

## 11. Diseño Técnico

| Archivo | Cambio |
|---|---|
| `docs/MVP_DEFINITION.md` | Añade el escenario 5 y el criterio de aceptación de alternar cámara. |
| `docs/TASKS.md` | Añade C7 a la oleada frontend y deja de tratarla como trabajo futuro. |
| `docs/PROJECT_STATUS.md` | Anota el cambio de alcance del 27/11 sobre el snapshot del 25/11. |
| `docs/MVP_EXTENDED.md` | Quita C7 de fuera de alcance y cambia la fila del issue #46. |
| `specs/features/C7-camera-switch/` | Requirements, spec, plan, borrador de issue y validación. |
| `frontend/src/hooks/useVideoCall.ts` | Añade `switchCamera`, bandera `switching` y llama a `publisher.cycleVideo()`; sin tocar el efecto de sesión. |
| `frontend/src/components/VideoCall.tsx` | Renderiza el botón "Alternar cámara" deshabilitado fuera de `connected`. |
| `frontend/src/components/VideoCall.test.tsx` | Añade `cycleVideo` al mock y tests AC-01..AC-07. |
| `frontend/src/index.css` | Estilo mínimo del botón junto al vídeo local. |
| `frontend/AGENTS.md` | §5: documentar el botón, `cycleVideo()` y el fallo silencioso. |

No se tocan `backend/openapi.yaml` ni `backend/prisma/schema.prisma`.

---

## 12. Estrategia de Pruebas

- Unitarias (Vitest + Testing Library) con `vi.mock('@vonage/client-sdk-video')`.
- El mock debe exponer `publisher.cycleVideo` como `vi.fn()` capaz de resolver y
  de rechazar; `OT.initPublisher` se cuenta para demostrar que no se recrea.
- Escenarios: cambio resuelto, rechazo silencioso, botón deshabilitado, doble
  clic, cleanup durante el cambio y comunicación con el par vía `session.publish`.
- Sin Pact, Supertest, Playwright ni cámara real.

---

## 13. Dependencias

- **Hard:** PR de docs/spec aprobado; C3 y C4 en `main` (ya cumplidos).
- **Stack fijado:** React 19, Vite 7, Vitest, SDK
  `@vonage/client-sdk-video@2.36.0`.
- **Servicio externo:** Vonage Video solo en demo manual; nunca en tests.

---

## 14. Preguntas Abiertas y Suposiciones

- `cycleVideo()` cambia al siguiente dispositivo disponible; no garantiza
  "frontal" o "trasera" en escritorio. La UI no lo promete.
- Si el navegador no expone otra cámara, la operación puede resolverse sin
  cambio visible o rechazarse; ambas se tratan como no bloqueantes.
- El primer publisher sigue sin `facingMode`: decide el navegador.
- No se añade aviso de fallo por decisión explícita del usuario.
- Para cumplir "1 issue = 1 rama = 1 PR", el cambio de alcance se entrega en un
  issue/PR de docs propio y el código queda en el issue #46.

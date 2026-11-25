# 03 — Plan de Implementación · C8 · Botón "Colgar" en `VideoCall`

> **Estado:** aprobado el 2026-11-25 e implementado en `feat/C8-hangup-button`.
> **Rama:** `feat/C8-hangup-button` (crear después de actualizar `main` desde GitHub).
> **Issue:** [#57](https://github.com/femCodersClub-vonage-program/homefix-connect/issues/57).

---

## 1. Desglose de Ficheros Afectados

- `[MODIFY]` `frontend/src/hooks/useVideoCall.ts`
  - Ampliar el tipo de retorno con `hangup: () => void`.
  - Crear un `hangupRef` estable dentro del hook.
  - Asignar dentro del `useEffect`, una vez definido `cleanup()`, una función que:
    - hace no-op si `disposed || cleaned`;
    - pone `status` a `ended` y `remoteConnected` a `false`;
    - llama al mismo `cleanup()` existente.
  - Dejar el `hangupRef` como no-op en la limpieza del efecto para no llamar a
    `setState` tras desmontaje.
  - No extraer ni reescribir `cleanup()`: se reutiliza tal cual.

- `[MODIFY]` `frontend/src/components/VideoCall.tsx`
  - Consumir `hangup` del hook.
  - Añadir `<button type="button" className="video-call__hangup" disabled={status !== 'connected'} onClick={hangup}>Colgar</button>`.
  - Ubicarlo junto al `<p role="status">`, antes del `video-call__stage`.
  - No añadir props ni lógica de rol.

- `[MODIFY]` `frontend/src/components/VideoCall.test.tsx`
  - Importar `fireEvent` y `afterEach`.
  - Añadir tests descritos en §3.
  - Usar el mock actual de `@vonage/client-sdk-video`; sin cámara, red ni Vonage real.

- `[MODIFY]` `frontend/index.css`
  - Regla mínima para `.video-call__hangup` reutilizando variables existentes;
    sin librería de UI ni animación.
  - Si el botón ya queda legible con estilos globales, omitir este fichero.

- `[MODIFY]` `frontend/AGENTS.md`
  - Añadir C8 al mapa en §2 y una línea en §5: "C8 expone `hangup()` y el botón
    'Colgar'; la desconexión es local, el cierre global lo hace el webhook".

- `[NEW]` `specs/features/C8-hangup-button/01-requirements.md` — ya creado.
- `[NEW]` `specs/features/C8-hangup-button/02-specification.md` — ya creado.
- `[NEW]` `specs/features/C8-hangup-button/issue-draft.md` — ya creado.
- `[NEW]` `specs/features/C8-hangup-button/03-plan.md` — este fichero.
- `[NEW]` `specs/features/C8-hangup-button/04-validation.md` — se creará al final
  con evidencia real de `pnpm check`, `pnpm test` y `pnpm build`.

Sin `[DELETE]`.

---

## 2. Cambios en Contratos y Base de Datos

- **Ninguno.** No se toca `backend/openapi.yaml`, `backend/prisma/schema.prisma`,
  `pnpm gen:types` ni los tipos generados.
- No hay endpoints, bodies, query params ni headers nuevos.
- No hacen falta `pnpm db:push` ni `pnpm db:seed` para C8.
- No se añaden dependencias: `pnpm-lock.yaml` queda intacto.
- El botón no envía SMS ni cambia `Incident.status`; eso sigue en A4/B3 vía
  `sessionDestroyed`.
- El issue #57 ya está publicado y el PR deberá indicar `Closes #57` cuando se
  abra, tras aprobación explícita.

---

## 3. Estrategia de Pruebas (TDD)

### Fase Roja — escribir primero en `VideoCall.test.tsx`

1. `muestra el botón "Colgar" habilitado cuando está conectada`
   - `await screen.findByText('Conectada')`
   - `expect(screen.getByRole('button', { name: 'Colgar' })).toBeEnabled()`.

2. `deshabilita "Colgar" mientras conecta y cuando termina`
   - Reutilizar el patrón de `connectCallback` del test existente.
   - Comprobar `toBeDisabled()` en `connecting`.
   - Tras `emit('sessionDisconnected')`, comprobar `toBeDisabled()` en `ended`.

3. `al pulsar "Colgar" limpia la sesión y muestra "Desconectada"`
   - Emitir `streamCreated` para cubrir `unsubscribe`.
   - `fireEvent.click(screen.getByRole('button', { name: 'Colgar' }))`.
   - Esperar `session.off` con los 4 eventos, `session.unsubscribe`,
     `session.unpublish`, `publisher.destroy()` y `session.disconnect()`.
   - Esperar texto "Desconectada" y botón deshabilitado.
   - `expect(fetchMock).not.toHaveBeenCalled()` con `vi.stubGlobal('fetch', fetchMock)`.

4. `no repite la limpieza si se pulsa dos veces o llega un evento tardío`
   - Primer click; segundo click; `emit('sessionDisconnected')`.
   - `expect(session.disconnect).toHaveBeenCalledTimes(1)`.
   - `expect(session.unpublish).toHaveBeenCalledTimes(1)`.

5. `mantiene "Desconectada" si disconnect falla`
   - `session.disconnect.mockRejectedValueOnce(new Error('offline'))`.
   - Click; la UI sigue en "Desconectada"; no aparece mensaje de error nuevo.

Ejecutar `pnpm --filter frontend test` y confirmar que los tests nuevos fallan
porque el botón y `hangup` no existen.

### Fase Verde — código mínimo

1. Ampliar el retorno de `useVideoCall` con `hangup`.
2. Implementar `hangupRef` dentro del efecto, reutilizando `cleanup()`.
3. Añadir el botón en `VideoCall`.
4. Añadir la regla CSS mínima si hace falta.
5. Actualizar `frontend/AGENTS.md`.
6. Ejecutar de nuevo el test de `VideoCall`; después la suite completa.

### Mocks y dobles

- `vi.mock('@vonage/client-sdk-video', …)` con `sdk.initSession` y
  `sdk.initPublisher`, ya presentes en `VideoCall.test.tsx`.
- `session.disconnect` devuelve `Promise.resolve()` por defecto; se sobreescribe
  solo en el caso de fallo.
- `fetch` se stubea solo en el test que comprueba que no hay llamada HTTP;
  `afterEach(() => vi.unstubAllGlobals())`.
- Sin Postgres, sin backend, sin ngrok y sin cámara real.

---

## 4. Orden Secuencial de Ejecución

1. Tras aprobación del plan, actualizar checkout con el `main` real de GitHub
   (`git fetch origin && git status`) y crear `feat/C8-hangup-button` desde ahí.
   No publicar la rama todavía.
2. Escribir los 5 tests rojos en `frontend/src/components/VideoCall.test.tsx`.
3. Ejecutar `pnpm --filter frontend test` y guardar salida roja.
4. Modificar `frontend/src/hooks/useVideoCall.ts`: tipo de retorno, `hangupRef`,
   asignación en el efecto y reset a no-op en el cleanup del efecto.
5. Modificar `frontend/src/components/VideoCall.tsx`: destructure `hangup` y
   render del botón.
6. Añadir CSS mínimo en `frontend/index.css` si el botón no queda legible.
7. Actualizar `frontend/AGENTS.md` §2 y §5.
8. Ejecutar tests verdes del archivo y después la suite completa.
9. Ejecutar `pnpm check`, `pnpm test` y `pnpm build`.
10. Demo manual en la app ya arrancada: entrar a `inc_demo`, pulsar "Colgar",
    verificar "Desconectada", cámara liberada y que el toast/SMS no aparecen en
    ese instante. Si la BD está `VIDEO_COMPLETED`, resetear a `VISIT_ASSIGNED`
    antes de entrar.
11. Crear `specs/features/C8-hangup-button/04-validation.md` con evidencia real.
12. Pedir autorización antes de commit, push y PR; resolver el punto de D-04 del
    §2 antes de abrir PR.

---

## 5. Riesgos Técnicos y Mitigaciones

| Riesgo | Mitigación |
|---|---|
| Doble limpieza al colgar y luego desmontar | El guard `cleaned` ya existente; test de segundo click y evento tardío. |
| Cámara encendida si `disconnect()` falla | La limpieza ya hace `unpublish()` y `destroy()` antes de `disconnect()`; test de rechazo. |
| `setState` después de desmontar | `hangupRef` se resetea a no-op en el cleanup del efecto y comprueba `disposed`. |
| La otra persona piensa que la visita terminó ya | La UI solo dice "Desconectada"; la spec prohíbe mostrar el toast de C5 en el clic. |
| Confusión con C7 en el mismo componente | C8 no toca controles de cámara; si C7 se mergea antes, revisar que los botones no se solapen. |
| `main` local desactualizado | Actualizar desde GitHub antes de crear la rama; A4/B3 ya están en el `main` real. |
| C5 (#51) mergea mientras C8 está abierta | Actualizar la rama desde `main` y revisar solapamiento en `frontend/AGENTS.md` e `index.css`. |
| Regresión en tests de C4 | No modificar los handlers ni el texto "Desconectada"; suite completa en verde. |

---

## 6. Matriz de Trazabilidad

| AC | Evidencia |
|---|---|
| AC-1 Botón visible y habilitado | `VideoCall.test.tsx` → `muestra el botón "Colgar" habilitado cuando está conectada`. |
| AC-2 Desconexión y limpieza | `VideoCall.test.tsx` → `al pulsar "Colgar" limpia la sesión y muestra "Desconectada"`. |
| AC-3 Estado "Desconectada" y botón deshabilitado | Mismo test; aserciones de texto y `toBeDisabled()`. |
| AC-4 Idempotencia | `VideoCall.test.tsx` → `no repite la limpieza si se pulsa dos veces o llega un evento tardío`. |
| AC-5 Sin transición de dominio | Mismo test con `fetchMock` sin llamadas; revisión de que `useVideoCall` no importa `api/` ni TanStack Query. |
| AC-6 Ambas partes | `VideoCallProps` no tiene `role`; mismo botón para cualquier token; revisión en `useVideoCall.ts` y demo con ambos roles si hay sesión. |
| AC-7 Aislamiento | `vi.mock('@vonage/client-sdk-video')`; sin fetch real, Postgres ni Vonage; `pnpm test` completo. |

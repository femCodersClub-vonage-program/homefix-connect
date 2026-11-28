# 03 — Plan Técnico · C7 · Alternar cámara durante la visita

> **Estado:** plan listo; **pendiente de aprobación explícita** antes de tocar
> código (`sdd-06`, `AGENTS.md` §5).
> **Spec:** `02-specification.md`.
> **Enfoque:** `publisher.cycleVideo()`, sin recrear publisher.

---

## 1. Desglose de Ficheros Afectados

### PR de docs/spec (primero, rama `docs/C7-mvp-scope`)

- `[MODIFY] docs/MVP_DEFINITION.md`
  - Añade el escenario 5 "alternar cámara durante la visita" y un criterio de
    aceptación en §7. No cambia estados ni entidades.
- `[MODIFY] docs/TASKS.md`
  - Añade C7 a la oleada 2 con dependencia C3/C4 y la saca de la cola futura.
- `[MODIFY] docs/PROJECT_STATUS.md`
  - Anota sobre el snapshot del 25/11 que C7 entra al MVP el 27/11 y que el
    enfoque es `cycleVideo()` por el riesgo de `streamDestroyed`.
- `[MODIFY] docs/MVP_EXTENDED.md`
  - Elimina C7 de la lista de fuera de alcance y cambia la fila del issue #46.
- `[MODIFY] specs/features/C7-camera-switch/01-requirements.md`
- `[MODIFY] specs/features/C7-camera-switch/02-specification.md`
- `[MODIFY] specs/features/C7-camera-switch/issue-draft.md`
  - Refleja el nuevo criterio y el cambio de alcance.

### PR de código (después, rama `feat/C7-camera-switch`)

- `[MODIFY] frontend/src/hooks/useVideoCall.ts`
  - Añade `switchCamera: () => void` a `VideoCallResult` y un `switchRef` con el
    mismo patrón que `hangupRef`, para no reiniciar el efecto ni la sesión.
  - Dentro del efecto añade `let connected = false` y `let switching = false`.
    `connected` se pone a `true` en el callback de éxito de `session.publish` y
    a `false` en `fail`, `hangup`, `handleDisconnected`, `handleConnectionDestroyed`,
    `handleRemoteGone` y `cleanup`.
  - `switchRef.current` comprueba `connected`, `!disposed`, `!cleaned`,
    `!switching` y `publisher`; marca `switching`, llama a
    `publisher.cycleVideo()`, ignora el rechazo con `.catch(() => undefined)`
    y libera la bandera en `finally`. No llama a `setStatus`, no publica ni
    despublica.
  - El retorno del hook incluye `switchCamera: () => switchRef.current()`.
  - `cleanup()` y la destrucción del publisher siguen exactamente como en C3/C8.
- `[MODIFY] frontend/src/components/VideoCall.tsx`
  - Consume `switchCamera` del hook.
  - Añade `<button type="button" disabled={status !== 'connected'}>` con texto y
    `aria-label` "Alternar cámara", junto al contenedor local. Sin nuevos props.
- `[MODIFY] frontend/src/components/VideoCall.test.tsx`
  - Añade `cycleVideo: vi.fn()` al mock de publisher.
  - Tests AC-01..AC-07: cuenta de `initPublisher`, de `cycleVideo`, rechazo
    silencioso, doble clic, deshabilitado y cleanup.
- `[MODIFY] frontend/src/index.css`
  - Estilo mínimo del botón dentro del contenedor local.
- `[MODIFY] frontend/AGENTS.md`
  - §5: documentar botón, `cycleVideo()`, fallo silencioso y que no se recrea
    el publisher.
- `[NEW] specs/features/C7-camera-switch/04-validation.md`
  - Evidencia real de `pnpm check`, `pnpm test` y `pnpm build`.

**No se tocan** `backend/openapi.yaml`, `backend/prisma/schema.prisma`,
`pnpm-lock.yaml`, el backend ni el contrato.

---

## 2. Cambios en Contratos y Base de Datos

**Ninguno.** No hay endpoints, payloads, migraciones ni scripts de base de
datos. `pnpm gen:types` no debe producir diff.

---

## 3. Estrategia de Pruebas (TDD)

### Fase roja

Escribir primero en `VideoCall.test.tsx`, con el SDK mockeado:

1. `alterna la cámara sin crear otro publisher`: un clic → una llamada a
   `cycleVideo()`, `initPublisher` sigue en 1.
2. `mantiene la llamada conectada al alternar`: "Conectada" sigue visible y no
   aparece "Desconectada" ni error.
3. `no muestra error si falla el cambio`: `cycleVideo` rechaza → texto sin
   cambios y `status` conectado.
4. `botón deshabilitado mientras conecta`: no se llama a `cycleVideo`.
5. `ignora un segundo clic mientras el cambio está en curso`: promesa controlada
   → una sola llamada.
6. `destruye solo el publisher activo al desmontar durante un cambio`: una sola
   llamada a `destroy()`.
7. `no toca el vídeo remoto`: `remoteConnected` sigue visible y
   `session.unsubscribe` no se llama.

### Fase verde

Código mínimo del plan §1. Sin cámara, sin `navigator.mediaDevices` reales y
sin red.

### Mocks y dobles

- `vi.mock('@vonage/client-sdk-video')` ya existe en `VideoCall.test.tsx`.
- El mock de `OT.initPublisher` devuelve `{ destroy, cycleVideo }`.
- `publisher.cycleVideo` es `vi.fn()`; se configura con `mockResolvedValue` o
  `mockRejectedValue` según el caso.
- Para el doble clic se usa una promesa pendiente resuelta manualmente.

---

## 4. Orden Secuencial de Ejecución

1. Aprobación de este plan por la usuaria.
2. PR/issue de docs: actualizar `MVP_DEFINITION`, `TASKS`, `PROJECT_STATUS`,
   `MVP_EXTENDED` y los ficheros de spec.
3. Publicar el borrador revisado en el issue #46 y moverlo a Ready.
4. Crear `feat/C7-camera-switch` desde la rama de docs (o desde `main` una vez
   mergeado el PR de docs).
5. Escribir los 7 tests en rojo y verificar que fallan por la falta de `switchCamera`.
6. Implementar `switchCamera` en el hook sin tocar la sesión ni el publisher.
7. Implementar botón y estilo en `VideoCall`.
8. Pasar a verde; ejecutar `pnpm --filter frontend test`.
9. Actualizar `frontend/AGENTS.md`.
10. Ejecutar `pnpm check`, `pnpm test`, `pnpm build`.
11. Demo manual en móvil con dos pestañas: alternar cámara, comprobar que la
    otra persona no se cuelga y que el LED se apaga al salir.
12. Escribir `04-validation.md`; proponer commit/PR y esperar autorización para
    push/PR.

---

## 5. Riesgos Técnicos y Mitigaciones

| Riesgo | Mitigación |
|---|---|
| Volver a colgar al par por recrear el publisher. | Prohibido `unpublish`/`initPublisher` en el cambio; test AC-01. |
| El botón quede habilitado antes de publicar. | Bandera `connected` interna además de `disabled` por `status`; AC-04. |
| Doble clic simultáneo. | Bandera `switching` en el closure; AC-05. |
| Promesa que resuelve tras el desmontaje. | Comprobación `disposed`/`cleaned`; AC-06. |
| `cycleVideo()` no cambie nada en escritorio. | Limitación documentada; fallo/resolución silenciosa por RN-04. |
| TypeScript no reconozca `cycleVideo`. | Declarado en `opentok.d.ts:531` del SDK 2.36; Sin `any`. |
| Confusión del usuario sobre qué cámara activó. | Texto neutro "Alternar cámara"; sin promesas de frontal/trasera. |

---

## 6. Matriz de Trazabilidad

| AC | Archivo | Test / comprobación |
|---|---|---|
| AC-01 | `useVideoCall.ts`, `VideoCall.tsx` | "alterna la cámara sin crear otro publisher" |
| AC-02 | `useVideoCall.ts` | "mantiene la llamada conectada al alternar" |
| AC-03 | `useVideoCall.ts` | "no muestra error si falla el cambio" |
| AC-04 | `VideoCall.tsx`, `useVideoCall.ts` | "botón deshabilitado mientras conecta" |
| AC-05 | `useVideoCall.ts` | "ignora un segundo clic mientras el cambio está en curso" |
| AC-06 | `useVideoCall.ts` | "destruye solo el publisher activo al desmontar durante un cambio" |
| AC-07 | `VideoCall.test.tsx` | suite sin cámara/red + `pnpm check`/`pnpm test`/`pnpm build` |

---

## 7. Punto de Parada

Este plan requiere aprobación explícita antes de crear la rama de código o
escribir tests. No se hará push ni se abrirá PR sin otra confirmación.

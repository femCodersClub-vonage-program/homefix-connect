# 02 — Specification · C8 · Botón "Colgar" en `VideoCall`

> **Tarea:** C8 · **Rama sugerida:** `feat/C8-hangup-button` · **Size:** XS
> **Issue:** [#57](https://github.com/femCodersClub-vonage-program/homefix-connect/issues/57)
> **Base:** `01-requirements.md` · `docs/MVP_DEFINITION.md` escenarios 3 y 4
> **Estado:** especificación cerrada el 2026-11-24; plan aprobado e implementado el 2026-11-25.

---

## 1. Resumen y Contexto

El MVP define que la visita termina "al colgar", pero hoy `VideoCall` no tiene
ningún botón para hacerlo. La desconexión solo ocurre al cerrar la pestaña, por
pérdida de red o porque cuelga la otra persona.

**Objetivo observable:** en una videollamada conectada, la usuaria ve un botón
"Colgar". Al pulsarlo, su cliente se desconecta de Vonage, la UI pasa a
"Desconectada" y el botón queda deshabilitado. La finalización global de la
visita, los SMS y el toast siguen gobernados por el webhook de Vonage, no por
este clic.

---

## 2. Alcance

### Dentro

- Botón real `<button>` con texto visible "Colgar" en `VideoCall`.
- Exponer una acción `hangup()` desde `useVideoCall`.
- Reutilizar el `cleanup()` existente: `off`, `unsubscribe`, `unpublish`,
  `publisher.destroy()` y `session.disconnect()`.
- Estado local `ended` / "Desconectada" tras colgar.
- Idempotencia: un segundo clic o un evento posterior no repite la limpieza.
- Tests unitarios con SDK de Vonage mockeado.
- Actualización de `frontend/AGENTS.md` con el botón de C8.

### Fuera

- Finalizar la visita para todos desde el frontend.
- Marcar `Incident.status = VIDEO_COMPLETED` en el clic.
- Enviar SMS desde el frontend ni mostrar el toast de C5 en el clic.
- Forzar la salida del otro participante (`forceDisconnect`).
- Roles `moderator`, permisos nuevos ni verificación de quién cuelga.
- Volver a `JoinButton`, reentrar a la sesión ni refrescar el token.
- Cambios en `backend/openapi.yaml`, `backend/prisma/schema.prisma`,
  `pnpm-lock.yaml`, dependencias, contract tests (Pact) ni E2E (Playwright).
- Mezclar C7 (cambio de cámara) en este PR.

---

## 3. Casos de Uso

1. La inquilina o la técnica entra a la videollamada desde `IncidentDetail`.
2. `VideoCall` muestra "Conectada", vídeo local y vídeo remoto.
3. La persona pulsa "Colgar".
4. El hook limpia la sesión local y el componente muestra "Desconectada".
5. La otra persona puede seguir en la sesión; cuando salga la última, Vonage
   enviará `sessionDestroyed`, A4/B3 cerrarán la incidencia y enviarán los SMS,
   y C5 mostrará el toast si la página sigue abierta.

---

## 4. Requisitos Funcionales

- **RF-01.** `VideoCall` renderiza un `<button type="button">Colgar</button>`.
- **RF-02.** El botón está habilitado solo cuando `status === 'connected'`.
- **RF-03.** `useVideoCall` expone `hangup: () => void`.
- **RF-04.** `hangup()` pone el estado local a `ended` y `remoteConnected` a
  `false`.
- **RF-05.** `hangup()` ejecuta el mismo `cleanup()` que ya usan los eventos de
  fin de sesión y el desmontaje.
- **RF-06.** Después de colgar, la UI muestra exactamente "Desconectada".
- **RF-07.** Después de colgar, el botón "Colgar" queda deshabilitado.
- **RF-08.** `hangup()` es idempotente: llamadas repetidas no producen una
  segunda desconexión ni una segunda limpieza.
- **RF-09.** Colgar no cambia `Incident.status`, no envía SMS ni dispara el
  toast de C5.
- **RF-10.** Colgar no desmonta `VideoCall` ni vuelve a mostrar `JoinButton`.
- **RF-11.** El botón funciona igual para inquilina y técnica; no hay comprobación
  de rol en el frontend.
- **RF-12.** No se añaden dependencias ni se modifica el contrato HTTP.

---

## 5. Reglas de Negocio

- **RN-01.** "Colgar" es una acción local sobre la sesión de Vonage del cliente,
  no una transición de dominio.
- **RN-02.** La visita se considera finalizada solo cuando el backend recibe
  `sessionDestroyed` y marca `VIDEO_COMPLETED`.
- **RN-03.** El toast de C5 afirma que las notificaciones se enviaron; por eso no
  puede mostrarse en el instante del clic local.
- **RN-04.** El estado `ended` ya existe en C3/C4; C8 no crea estados nuevos.
- **RN-05.** Si la otra persona ya colgó y el state es `ended`, el botón no está
  disponible.
- **RN-06.** La limpieza es propiedad del hook; el componente solo llama a la
  acción expuesta y no toca el SDK.

---

## 6. Contrato de Entrada

No hay body, query ni params HTTP nuevos. Entradas internas:

| Nombre | Tipo | Origen | Requerido | Validación |
|---|---|---|---|---|
| `status` | `VideoCallStatus` | `useVideoCall` | Sí | `idle \| connecting \| connected \| error \| ended`. Habilita el botón solo en `connected`. |
| `hangup` | `() => void` | `useVideoCall` | Sí | Sin argumentos; se llama desde `onClick`. |
| Click del usuario | `MouseEvent<HTMLButtonElement>` | Botón "Colgar" | Sí | Botón real; `fireEvent.click` en tests. |

No se lee `role`, `incidentId` ni `token` en la acción de colgar.

---

## 7. Contrato de Salida

No hay salida HTTP. Salida observable:

| Situación | DOM / SDK esperado |
|---|---|
| `status === 'connected'` | `<button type="button">Colgar</button>` habilitado. |
| Click en "Colgar" | `session.disconnect()` llamado; limpieza completa; texto "Desconectada". |
| Tras colgar | Botón "Colgar" deshabilitado; `VideoCall` sigue montado. |
| Segundo click / evento tardío | Sin segunda llamada a `disconnect()` ni limpieza duplicada. |
| Otra persona cuelga primero | Texto "Desconectada"; botón deshabilitado; C8 no cambia este flujo de C4. |

La limpieza existente incluye: `off` de `sessionDisconnected`,
`connectionDestroyed`, `streamCreated` y `streamDestroyed`; `unsubscribe` del
stream remoto; `unpublish`; `publisher.destroy()`; `session.disconnect()`.

---

## 8. Manejo de Errores

No se introducen códigos HTTP ni mensajes de error nuevos.

| Situación | Comportamiento |
|---|---|
| `session.disconnect()` rechaza o falla | El `cleanup()` existente ya lo ignora de forma segura; la UI queda en "Desconectada". No se añade pantalla de error. |
| Doble click rápido | El guard `cleaned` del `cleanup()` evita duplicar la limpieza; el estado ya es `ended`. |
| Desconexión remota antes del click | C4 ya pone `ended`; el botón está deshabilitado y C8 no interviene. |
| Desmontaje inmediato tras colgar | El cleanup del efecto se ejecuta otra vez pero es idempotente. |
| Falta el webhook de Vonage | La UI local queda "Desconectada"; la incidencia no cambia. No es un error de C8. |

---

## 9. Casos Límite

- `connected` sin stream remoto: el botón sigue habilitado; se puede colgar.
- `connecting`, `idle`, `error` o `ended`: botón deshabilitado.
- StrictMode: el doble mount/cleanup no deja dos sesiones ni dos botones.
- Click cuando la otra persona acaba de desconectar: estado `ended`, no-op.
- Cambio de rol durante la llamada: el selector ya está bloqueado por C3/C4; C8
  no lo modifica.
- C7 (cambio de cámara) puede añadir otro botón: los controles deben coexistir
  en el mismo `VideoCall` sin solaparse; C8 no implementa C7.

---

## 10. Criterios de Aceptación

1. **Botón visible**
   Given `VideoCall` está `connected`
   When se renderiza el componente
   Then existe un `<button type="button">` con texto visible "Colgar" y está
   habilitado.

2. **Desconexión local**
   Given `VideoCall` está `connected`
   When se pulsa "Colgar"
   Then se llama a `session.disconnect()` y se ejecuta la limpieza del SDK.

3. **Estado posterior**
   Given se ha pulsado "Colgar"
   Then la UI muestra "Desconectada" y el botón queda deshabilitado.

4. **Idempotencia**
   Given ya se colgó
   When se pulsa otra vez o llega un evento de desconexión tardío
   Then no se repite `disconnect()` ni la limpieza.

5. **Sin transición de dominio**
   Given se pulsa "Colgar"
   Then no cambia `Incident.status`, no se envían SMS y no aparece el toast de C5
   por este clic.

6. **Ambos roles**
   Given la inquilina o la técnica están conectadas
   When cualquiera pulsa "Colgar"
   Then ambas pueden desconectarse con el mismo comportamiento.

7. **Aislamiento**
   Given la suite de C8
   Then se usa el SDK mockeado, sin red real, sin Postgres y sin Vonage real.

---

## 11. Diseño Técnico

### Ficheros

```text
frontend/src/
├── hooks/useVideoCall.ts       # MODIFY: exponer hangup() y reutilizar cleanup()
├── components/VideoCall.tsx    # MODIFY: botón "Colgar" y onClick
├── components/VideoCall.test.tsx # MODIFY: tests del botón
└── AGENTS.md                   # MODIFY: mapa y nota C8
```

Sin cambios en backend, `openapi.yaml`, `schema.prisma` ni `pnpm-lock.yaml`.

### Hook `useVideoCall`

El valor devuelto pasa de:

```ts
{ status, remoteConnected }
```

a:

```ts
{ status, remoteConnected, hangup }
```

`hangup` es una función estable que:

1. Pone `status` a `ended` y `remoteConnected` a `false`.
2. Llama al mismo `cleanup()` que ya usan los handlers y el desmontaje.
3. No lanza excepciones: `cleanup()` ya tolera fallos de `disconnect()`.
4. No modifica ningún estado de React Query ni llama a la API.

El `cleanup()` existente mantiene su guard `cleaned`; por eso `hangup()` puede
llamarse más de una vez sin duplicar efectos.

### Componente `VideoCall`

- Añade el botón cerca del indicador de estado, dentro de `<section>`.
- `disabled={status !== 'connected'}`.
- `onClick={hangup}`.
- Sin `aria-label` adicional: el texto visible "Colgar" es el nombre accesible.
- Mantiene el texto "Desconectada" definido en C3/C4.

### CSS

Reutilizar estilos existentes; si hace falta, añadir una regla mínima para el
botón en `index.css` sin framework ni animación. El botón debe ser un `<button>`
real y distinguishable visualmente del estado.

---

## 12. Estrategia de Pruebas

### Unitarias en `VideoCall.test.tsx`

Con el mock actual de `OT.initSession`:

- Muestra "Colgar" habilitado cuando `status === 'connected'`.
- Deshabilita "Colgar" en `connecting`, `idle`, `error` y `ended`.
- Al pulsar "Colgar": llama a `session.disconnect()`, hace `unpublish`,
  `destroy`, `off` de los 4 eventos y `unsubscribe` si hay stream remoto.
- La UI pasa a "Desconectada" y el botón queda deshabilitado.
- Un segundo click no llama dos veces a `disconnect()`.
- El botón es accesible por rol y nombre: `getByRole('button', { name: 'Colgar' })`.

### Aislamiento

- Sin llamadas reales a Vonage: se usa el mock de `OT.initSession` ya existente.
- Sin backend, Postgres, contract tests (Pact) ni E2E (Playwright).
- Sin snapshots.

### Verificación

```bash
pnpm --filter frontend test
pnpm check
pnpm test
pnpm build
```

---

## 13. Dependencias

- C3 (#8) y C4 (#20): hooks y eventos de vídeo ya implementados.
- A4 (#10) y B3 (#14): cierre global y SMS por `sessionDestroyed` en el `main`
  real de GitHub.
- C5 (#21, PR #51): toast; no bloquea C8.
- C7 (#46): toca el mismo componente; coordinar si se implementa después.
- Stack fijado: React 19, TypeScript estricto, TanStack Query 5, SDK Vonage
  2.36.0, Vitest + Testing Library. Sin dependencias nuevas.

---

## 14. Preguntas Abiertas y Suposiciones

No quedan preguntas bloqueantes. Decisiones D-01 a D-04 de `01-requirements.md`:

- La desconexión es local; la visita global se cierra por webhook.
- Pueden colgar ambas partes.
- La UI queda en "Desconectada", sin volver a `JoinButton`.
- El issue se publicó como #57 el 2026-11-25 tras autorización explícita.

Suposición no bloqueante: Vonage tarda aproximadamente un minuto en enviar
`sessionDestroyed` después de que salga el último participante; por eso los SMS
y el toast pueden no ser inmediatos.

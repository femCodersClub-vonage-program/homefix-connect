# 04 — Validation · C4 · VideoCall: vídeo remoto + eventos

> **Issue:** [#20](https://github.com/femCodersClub-vonage-program/homefix-connect/issues/20)
> **Rama verificada:** `feat/C4-video-remote` · **Fecha:** 2026-11-21
> **Base:** `02-specification.md` · `03-plan.md`

---

## 1. Resumen de Ejecución

**Estado general: PASSED (verificación automática + demo manual).**

- TDD: fase roja confirmada con 8 fallos esperados; fase verde con 43/43 tests
  de frontend.
- `pnpm check`, `pnpm test` y `pnpm build` en verde desde la raíz.
- Demo manual **OK** en dos dispositivos mediante ngrok: vídeo remoto visible en
  ambos y paso a "Desconectada" al cerrar una de las pestañas.

---

## 2. Matriz de Criterios de Aceptación

| ID | Criterio | Test que lo cubre | Estado | Evidencia |
|---|---|---|---|---|
| AC-01 | `streamCreated` suscribe el stream remoto | `VideoCall.test.tsx` · "suscribe el stream remoto en el contenedor remoto" | PASS | `session.subscribe` recibe el stream, `getByLabelText('Vídeo remoto')` y `subscriberOptions`. |
| AC-02 | No se suscribe el stream local | `VideoCall.test.tsx` · "no suscribe el stream publicado por esta sesión" | PASS | `subscribe` no se llama con `connectionId === session.connection.connectionId`. |
| AC-03 | Placeholder sin stream remoto | `VideoCall.test.tsx` · "muestra el placeholder mientras no hay stream remoto" | PASS | Texto "Esperando a la otra persona…" visible en `connected`. |
| AC-04 | `streamDestroyed` desuscribe y muestra "Desconectada" | `VideoCall.test.tsx` · "desuscribe el stream remoto y pasa a Desconectada" | PASS | `session.unsubscribe(subscriber)` + texto visible. |
| AC-05 | Evento de otro stream se ignora | `VideoCall.test.tsx` · "ignora un streamDestroyed de otro stream" | PASS | Sin `unsubscribe`; el estado sigue "Conectada". |
| AC-06 | Fin de sesión limpia y desconecta | `VideoCall.test.tsx` · `it.each(['sessionDisconnected', 'connectionDestroyed'])` | PASS | "Desconectada" + `unpublish`/`destroy`/`disconnect`. |
| AC-07 | Error de suscripción | `VideoCall.test.tsx` · "muestra error si la suscripción falla" | PASS | Texto genérico de error + `unsubscribe` + `disconnect`. |
| AC-08 | Cleanup completo | `VideoCall.test.tsx` · "hace cleanup completo al desmontar" | PASS | `off` de 4 eventos + `unsubscribe` + limpieza de C3. |
| AC-09 | Accesibilidad | `VideoCall.test.tsx` · test de init | PASS | `role="status"` con `aria-live="polite"`. |
| AC-10 | Aislamiento de tests | `VideoCall.test.tsx` · mock de SDK | PASS | 15 tests sin cámara ni red real. |

---

## 3. Evidencia de Comandos

### Fase roja (antes de implementar)

```text
$ pnpm --filter frontend test -- src/components/VideoCall.test.tsx
❯ src/components/VideoCall.test.tsx (15 tests | 8 failed) 1122ms
Test Files  1 failed | 4 passed (5)
Tests       8 failed | 35 passed (43)
```

Los 8 fallos correspondían a comportamiento aún no implementado: contenedor
remoto, placeholder, `subscribe`, `unsubscribe`, texto "Desconectada", error de
suscripción y `off` de los nuevos listeners.

### Fase verde

```text
$ pnpm --filter frontend test
✓ src/api/types.test.ts (4 tests)
✓ src/api/video.test.ts (3 tests)
✓ src/components/VideoCall.test.tsx (15 tests)
✓ src/pages/IncidentDetail.test.tsx (18 tests)
✓ src/App.test.tsx (3 tests)

Test Files  5 passed (5)
Tests       43 passed (43)
```

```text
$ pnpm check
$ pnpm lint && pnpm typecheck
$ eslint .
$ pnpm -r typecheck
frontend typecheck: Done
backend typecheck: Done
```

```text
$ pnpm test
backend  Test Files  6 passed (6) · Tests  64 passed (64)
frontend Test Files  5 passed (5) · Tests  43 passed (43)
Done
```

```text
$ pnpm build
backend build: Done
frontend build: ✓ built in 5.04s
```

### Demo manual (OK)

```text
$ docker compose ps
homefix-db   postgres:16-alpine   Up   healthy   0.0.0.0:5432->5432/tcp

$ pnpm db:push
The database is already in sync with the Prisma schema.

$ pnpm db:seed
Seed OK · inc_demo (VISIT_ASSIGNED) · visit_demo · vs_demo (PENDING)

$ curl -sS http://localhost:3000/api/health
{"status":"ok","timestamp":"2026-11-21T10:13:09.832Z"}

$ ngrok http 5173
https://greedy-princess-reconvene.ngrok-free.dev

$ curl -sS -o /dev/null -w '%{http_code}\n' \
  'https://greedy-princess-reconvene.ngrok-free.dev/?incidentId=inc_demo'
200
```

Vite se arrancó con `__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS=.ngrok-free.dev`
en `process.env` (Vite 7 no lo lee desde `.env`).

Resultado observado por el usuario en dos dispositivos con la URL anterior:

- Rol `TENANT` en uno y `TECHNICIAN` en otro.
- Vídeo remoto visible en ambos.
- Al cerrar una pestaña, la otra pasa a "Desconectada".

La incidencia de cámara frontal/trasera detectada en móvil se ha registrado
aparte como C7; no forma parte del criterio de aceptación de C4.

---

## 4. Revisión de Regresiones

- C3 sigue verde: init, publicación, `sessionDisconnected`,
  `connectionDestroyed`, errores y cleanup se mantienen; solo cambia el texto de
  `ended` a "Desconectada".
- `IncidentDetail.test.tsx` sigue con 18/18: las props de `VideoCall` no
  cambiaron y no se tocó la página.
- `App.test.tsx` y la API siguen verdes.
- No se añadieron dependencias ni se tocó `pnpm-lock.yaml`.
- No se modificaron `backend/openapi.yaml`, `backend/prisma/schema.prisma` ni
  código backend.
- El único cambio de API interna es el retorno de `useVideoCall`, consumido
  exclusivamente por `VideoCall`.

# 04 — Validation · C3 · VideoCall: init SDK + vídeo local + cleanup

> **Issue:** [#19](https://github.com/femCodersClub-vonage-program/homefix-connect/issues/19)
> **Rama:** `feat/C3-video-call-init`
> **Base:** `02-specification.md` · `03-plan.md`
> **Fecha:** 2026-11-20
> **Estado:** implementación, validación automatizada y comprobación visual de
> cámara y cleanup completadas.

---

## 1. Alcance validado

- `POST /api/video-tokens` desde el frontend con rol y `incidentId`.
- Estado de espera "Conectando…" y bloqueo del botón.
- Montaje de `VideoCall` con `applicationId`, `sessionId` y `token`.
- Mensajes de error 403, 409, 500 y red.
- Inicialización del SDK, conexión, publicación local y estados.
- Cleanup al desmontar y ante eventos de desconexión.
- Tipos del contrato sin duplicar `openapi.yaml`.

Fuera de esta validación: vídeo remoto (C4), toast de fin de visita (C5),
botón de colgar, reconexión y refresco de token.

---

## 2. Evidencia automatizada

### `pnpm check`

```text
$ pnpm lint && pnpm typecheck
$ eslint .
$ pnpm -r typecheck
backend typecheck$ tsc --noEmit -p tsconfig.json
frontend typecheck$ tsc --noEmit -p tsconfig.json
frontend typecheck: Done
backend typecheck: Done
```

Resultado: **sin errores**.

### `pnpm test`

```text
$ pnpm -r test
backend test: Test Files  6 passed (6)
backend test:      Tests  61 passed (61)
frontend test: Test Files  5 passed (5)
frontend test:      Tests  36 passed (36)
```

Resultado: **97 tests verdes**.

### `pnpm build`

```text
$ pnpm -r build
backend build$ tsc -p tsconfig.json
backend build: Done
frontend build: ✓ 91 modules transformed.
frontend build: ✓ built in 4.87s
frontend build: Done
```

Resultado: **backend y frontend compilan**. Aviso no bloqueante de Vite por el
chunk del SDK (`3,426.04 kB` minificado). No se añade code-splitting en C3
porque no estaba en el plan.

---

## 3. Evidencia funcional local

### Infraestructura

```text
$ docker compose ps
homefix-db   postgres:16-alpine   Up (healthy)   0.0.0.0:5432->5432/tcp
```

```text
$ pnpm db:push
The database is already in sync with the Prisma schema.
```

```text
$ pnpm db:seed
Seed OK
  incidencia : inc_demo (VISIT_ASSIGNED)
  visita     : visit_demo (CONFIRMED)
  video      : vs_demo (PENDING)
  usuarios   : usr_tenant_demo, usr_technician_demo, usr_manager_demo
```

### Backend

```text
$ curl :3000/api/health
health 200
{"status":"ok"}
```

### Token real para ambos roles

Se solicitó el token con `TENANT` y `TECHNICIAN`. No se registraron ni
pegaron valores de `token`, `sessionId` o `applicationId`; solo el resultado
estructural:

```text
TENANT 200 TECHNICIAN 200
{
  "tenantKeys": ["applicationId", "sessionId", "token"],
  "technicianKeys": ["applicationId", "sessionId", "token"],
  "sameSessionId": true,
  "nonEmpty": {
    "applicationId": true,
    "sessionId": true,
    "token": true
  }
}
```

Resultado: **misma sesión para inquilina y técnica**, respuesta conforme a
`VideoTokenResponse`.

### Frontend

```text
$ curl :5173/
frontend 200
<title>Homefix Connect
```

Resultado: **Vite sirve la aplicación**.

### Comprobación visual en navegador

Realizada por Miranda el 2026-11-20 en
`http://localhost:5173/?incidentId=inc_demo`:

```text
- Primera entrada pidió permiso de cámara → permitido.
- Botón "Entrar a la videollamada" → entró en la sesión.
- Estado "Conectando…" → "Conectada".
- Imagen de la cámara local visible correctamente.
- Probado con TENANT y TECHNICIAN; el token usa el mismo sessionId.
- Al salir/recargar, el testigo LED de la cámara se apaga.
- No hay botón para volver/salir: fuera de alcance de C3 (C4/I2).
```

Resultado: **vídeo local, permiso de cámara y cleanup OK**.

---

## 4. Trazabilidad de criterios de aceptación

| AC | Evidencia |
|---|---|
| 1. Entrada correcta + token | `IncidentDetail.test.tsx` · click, POST, cabeceras, body y montaje de `VideoCall` |
| 2. Estado de espera | `IncidentDetail.test.tsx` · promesa pendiente + "Conectando…" |
| 3. Init del SDK | `VideoCall.test.tsx` · `initSession` + `connect` |
| 4. Publicación local | `VideoCall.test.tsx` · `initPublisher` + `publish` + "Conectada" |
| 5. Fin de sesión | `VideoCall.test.tsx` · `sessionDisconnected`/`connectionDestroyed` |
| 6. Error de conexión | `VideoCall.test.tsx` · callback de error |
| 7. Cleanup al desmontar | `VideoCall.test.tsx` · `unmount` + `off`/`unpublish`/`destroy`/`disconnect` |
| 8. Error 409 | `IncidentDetail.test.tsx` · `HttpError` 409 |
| Error 404 | `IncidentDetail.test.tsx` · "Incidencia no encontrada" |
| 9. Error 403 | `IncidentDetail.test.tsx` · `HttpError` 403 |
| 10. Error de red | `IncidentDetail.test.tsx` · `fetch` rechaza |
| 11. Rol técnico | `IncidentDetail.test.tsx` · cabeceras y body con `TECHNICIAN` |
| 12. Sin cámara en tests | `VideoCall.test.tsx` · SDK mockeado |
| Contrato HTTP | `video.test.ts` · `requestVideoToken` |
| Tipo del contrato | `types.test.ts` · `VideoTokenResponse` |

---

## 5. Pendiente para el PR

- [x] Comprobar en navegador con cámara real: permiso, entrada y vídeo local
      visibles para `TENANT` y `TECHNICIAN`, con el mismo `sessionId`.
- [x] Comprobar que el testigo LED de la cámara se apaga al recargar/desmontar.
- [ ] Pegar esta evidencia en la descripción del PR.
- [ ] Revisar el aviso de tamaño de bundle; decidir si se aborda en una tarea
      aparte.
- [ ] No se hace commit, push ni PR sin autorización explícita.

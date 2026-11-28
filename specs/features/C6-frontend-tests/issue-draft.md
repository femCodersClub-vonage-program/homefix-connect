# C6 · Tests frontend — borrador de issue

> Borrador local generado desde `specs/features/C6-frontend-tests/02-specification.md`. No publicado en GitHub.

## Caso de uso (fijo)

CU-07 · Verificación automatizada del carril frontend (C2–C5).

## Criterio de aceptación (fijo, conductual)

- [x] `IncidentDetail`: render con datos, estado de carga, errores y botón habilitado/deshabilitado según estado.
- [x] `VideoCall`: inicialización del SDK, limpieza de recursos y estados visibles.
- [x] `VideoCall`: suscripción al vídeo remoto y desconexión sin dejar UI colgada.
- [x] `Toast`: aparece al detectar transición a `VIDEO_COMPLETED`.
- [x] Cobertura: `pnpm --filter frontend test` pasa.

## Qué hace / cómo lo hace (completar antes de empezar)

- **Qué:** deja evidencia automática de que el carril frontend C2–C5 (y C8 ya mergeado) mantiene su comportamiento observable, añadiendo tests directos de `JoinButton` y del transporte `api/client.ts`.
- **Cómo:** PR solo de tests con Vitest + Testing Library. Se mantiene `vi.stubGlobal(fetch)` y `vi.mock` del SDK; no se añade MSW ni `@vitest/coverage-v8`. No se cambia código de producción, ni `vite.config.ts`, ni tipos generados. Si aparece un bug de producción, se abre un issue/fix aparte (1 issue = 1 rama = 1 PR).

## Especificación incompleta — definición mínima

- **Datos mínimos:** fixtures de incidencia (`id`, `title`, `description`, `status`, `technician`, `visit`), triple del token (`applicationId`, `sessionId`, `token`) y timers controlados con `vi.useFakeTimers()`. IDs simulados (`inc_demo`, `sess_demo`, `app_demo`, `token_demo`); sin secretos ni teléfonos reales.
- **Estados / enums:** incidencia `REPORTED | VISIT_ASSIGNED | VIDEO_COMPLETED | CLOSED`; visita `PENDING | CONFIRMED | COMPLETED | CANCELLED`; rol `TENANT | TECHNICIAN`; videollamada `idle | connecting | connected | error | ended`. Ninguno nuevo.
- **Payload / contrato:** no hay payload ni endpoint nuevos. Los mocks reproducen el contrato existente (`GET /api/incidents/{id}`, `POST /api/video-tokens`). `backend/openapi.yaml` no se toca.
- **Errores:** solo los ya acordados (`403`, `404`, `409`, `500`). Se valida el mapeo a `HttpError` con `status` y mensaje; no se inventan códigos ni manejadores nuevos.

## Dependencias

- **Hard:** #8 (C2), #9 (C3), #10 (C4), #11 (C5). Contexto: #57 (C8) ya está mergeado en `main` y sus tests forman parte de la suite.
- **Soft (mock hasta que exista):** ninguna. Vonage Video y `fetch` se mockean en los tests.

## Rama sugerida

`test/C6-frontend`

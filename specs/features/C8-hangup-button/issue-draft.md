## C8 · Añadir botón "Colgar" en la videollamada

> Plantilla `.github/ISSUE_TEMPLATE/tarea.md`, publicada como [#57](https://github.com/femCodersClub-vonage-program/homefix-connect/issues/57) el 2026-11-25.

## Caso de uso (fijo)

`docs/MVP_DEFINITION.md` escenarios 3 y 4:

> Dado una videollamada activa entre inquilina y técnica
> Y la sesión de vídeo está en estado "ACTIVE"
> Cuando la videollamada termina (cuelgan o se cierra la sesión)
> Entonces Vonage Video envía el webhook `session.end` al backend
> Y el backend actualiza la sesión de vídeo a "ENDED"
> Y el backend actualiza la incidencia a "VIDEO_COMPLETED"
> Y el backend envía 2 SMS vía Vonage Messages API.

> Dado que la videollamada ha finalizado y los SMS se han enviado
> Cuando el frontend detecta que la incidencia pasó a "VIDEO_COMPLETED"
> Entonces muestra el aviso "Visita finalizada. Notificaciones enviadas a gestora e inquilina."
> Y el botón "Entrar a la videollamada" queda deshabilitado con "Visita realizada".

## Criterio de aceptación (fijo, conductual)

- [ ] Con `VideoCall` en `connected`, existe un botón real `<button>` con texto visible "Colgar" y está habilitado.
- [ ] Al pulsar "Colgar", se llama a `session.disconnect()` y se ejecuta la limpieza completa del SDK (`off`, `unsubscribe`, `unpublish`, `publisher.destroy()`).
- [ ] Después de colgar, la UI muestra "Desconectada" y el botón queda deshabilitado.
- [ ] Un segundo clic o un evento de desconexión tardío no repite la limpieza.
- [ ] El clic no cambia `Incident.status`, no envía SMS y no dispara el toast de C5.
- [ ] Inquilina y técnica pueden colgar con el mismo comportamiento.
- [ ] Tests unitarios con SDK mockeado; sin red, sin Postgres ni Vonage real.

## Qué hace / cómo lo hace (completar antes de empezar)

- **Qué:** permite colgar explícitamente desde la videollamada y deja la UI en "Desconectada" sin dejar la sesión local abierta.
- **Cómo:** `useVideoCall` expone `hangup()` y reutiliza el `cleanup()` existente; `VideoCall` añade el botón y llama a esa acción. La finalización global sigue dependiendo del webhook `sessionDestroyed` de Vonage (A4/B3). Sin cambios en backend ni contrato HTTP.

## Especificación incompleta — definición mínima

- **Datos mínimos:** solo el estado local `VideoCallStatus` y la acción `hangup()`. No se leen campos nuevos de la API.
- **Estados / enums:** se reutilizan `idle | connecting | connected | error | ended` de C3/C4. No se añaden estados; `IncidentStatus` y `VideoSessionStatus` no cambian en este PR.
- **Payload / contrato:** no hay payload ni endpoint nuevo. No se actualiza `backend/openapi.yaml`, `backend/prisma/schema.prisma` ni los tipos generados.
- **Errores:** no se introducen códigos HTTP. Si `session.disconnect()` falla, el `cleanup()` existente lo tolera y la UI queda en "Desconectada". No se añade `role="alert"` ni mensaje nuevo.

### Decisiones acordadas

| # | Decisión |
|---|---|
| D-01 | Colgar desconecta solo al participante local; no finaliza la visita ni envía SMS en el clic. |
| D-02 | Pueden colgar la inquilina y la técnica. |
| D-03 | Tras colgar, `VideoCall` permanece montado con el estado "Desconectada". |
| D-04 | La tarea se numera como C8; el issue se publicó como #57 el 2026-11-25. |

### Consecuencias aceptadas

- La otra persona puede seguir en la sesión.
- Los SMS y el toast pueden tardar porque Vonage envía `sessionDestroyed` aproximadamente un minuto después de que salga el último participante.

## Dependencias

- **Hard:** C3 (#8) y C4 (#20) ya implementados; A4 (#10), B1/B2/B3 (#14) y X3 en el `main` real de GitHub para el flujo completo.
- **Soft (mock hasta que exista):** callback de Session Monitoring configurado en Vonage, C5 (#21, PR #51) para el toast, I1 (#23) para demo E2E.

## Rama sugerida

`feat/C8-hangup-button`

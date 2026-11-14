# A3 · POST /api/video-tokens — Especificación

> Issue: #9 · Requisitos: [`01-requirements.md`](./01-requirements.md) · Contrato: `backend/openapi.yaml` (T1, PR #31)

## 1. Resumen y contexto

`feat(A3): POST /video-tokens` — Closes #9.

Endpoint que comprueba si una persona puede entrar en la videollamada de una incidencia y, si puede, le entrega los datos para conectarse a Vonage Video (`applicationId`, `sessionId`, `token`). Es la "recepción" de la sala: no gestiona la llamada, solo da acceso.

## 2. Alcance

**Dentro de alcance**

- Ruta `POST /api/video-tokens` con validación de headers y body (zod).
- Validaciones de existencia, permisos y estados (404 / 403 / 409).
- Creación de la sesión de Vonage en el primer acceso si no existe (vía `VideoService.createSession`, stub).
- Paso de la sesión de `PENDING` a `ACTIVE` al entregar el primer token.
- Tests de contrato con Supertest.

**Fuera de alcance**

- Integración real con Vonage (A1/A2): se usan los stubs de X1.
- Webhook `session.end` y paso a `ENDED` (A4).
- Autenticación real, rate limiting.

## 3. Casos de uso

MVP_DEFINITION §4, Escenarios 1 y 2:

1. La inquilina pulsa "Entrar a la videollamada" → el front llama a `POST /api/video-tokens` → recibe sus datos de conexión → la sesión pasa a `ACTIVE`.
2. La técnica pulsa "Entrar a la videollamada" → mismo flujo → recibe su token para la **misma** sesión.

## 4. Requisitos funcionales

- **RF-01:** Exponer `POST /api/video-tokens` en `src/routes/video-tokens.ts`, montado en `app.ts` bajo `/api`.
- **RF-02:** Validar headers `X-User-Id` y `X-User-Role` y body `{ incidentId }` con zod.
- **RF-03:** Buscar la incidencia con su visita y sesión de vídeo.
- **RF-04:** Si la sesión no tiene `vonageSessionId`, crear la sesión con `VideoService.createSession(visitId)` y guardar el id.
- **RF-05:** Generar el token con `VideoService.generateToken(vonageSessionId, role)`.
- **RF-06:** Si la sesión está `PENDING`, pasarla a `ACTIVE` y guardar `startedAt`.
- **RF-07:** Responder 200 con `{ applicationId, sessionId, token }`.

## 5. Reglas de negocio

- **RN-01:** Solo pueden pedir token la inquilina (`tenantId`) y la técnica (`technicianId`) de esa incidencia. La gestora no (MVP §2).
- **RN-02:** El `X-User-Role` debe coincidir con el papel del usuario en esa incidencia: `TENANT` ↔ `tenantId`, `TECHNICIAN` ↔ `technicianId`. Si no coincide → 403.
- **RN-03:** La incidencia debe estar en `VISIT_ASSIGNED`.
- **RN-04:** La visita debe existir y estar en `CONFIRMED`.
- **RN-05:** La sesión de vídeo no puede estar `ENDED`.
- **RN-06:** Orden de comprobación: 400 → 404 → 403 → 409. Se devuelve el primer error que aplique.

## 6. Contrato de entrada

| Campo         | Dónde  | Tipo        | Obligatorio | Validación                            |
| ------------- | ------ | ----------- | ----------- | ------------------------------------- |
| `X-User-Id`   | header | string      | Sí          | No vacío                              |
| `X-User-Role` | header | enum `Role` | Sí          | `TENANT` \| `TECHNICIAN` \| `MANAGER` |
| `incidentId`  | body   | string      | Sí          | No vacío (`cuid`, sin `format: uuid`) |

## 7. Contrato de salida

**200 OK**

```json
{
  "applicationId": "<VONAGE_APPLICATION_ID>",
  "sessionId": "<vonageSessionId>",
  "token": "<token de Vonage>"
}
```

## 8. Manejo de errores

Formato siempre `{ "error": "<mensaje>" }` (AGENTS.md §11).

| Código | Cuándo                                                                                                        |
| ------ | ------------------------------------------------------------------------------------------------------------- |
| 400    | Falta un header o el body, `X-User-Role` no es un valor del enum, `incidentId` vacío                          |
| 404    | La incidencia no existe                                                                                       |
| 403    | El usuario no es la inquilina ni la técnica de la incidencia (incluye `MANAGER`) o su rol no coincide (RN-02) |
| 409    | Incidencia no `VISIT_ASSIGNED`, visita inexistente o no `CONFIRMED`, o sesión `ENDED`                         |
| 500    | Falta `VONAGE_APPLICATION_ID` en la config o falla el `VideoService`                                          |

## 9. Casos límite

- La técnica pide token cuando la sesión ya está `ACTIVE` → 200, misma `sessionId`, sin cambiar el estado.
- La misma persona pide token dos veces → 200 las dos veces, misma `sessionId` (no se crea otra sesión).
- `incidentId` con espacios o vacío → 400.
- La incidencia no tiene técnica asignada (`technicianId = null`) y la pide un `TECHNICIAN` → 403.
- `VONAGE_APPLICATION_ID` no configurado → 500 con mensaje claro.

## 10. Criterios de aceptación

**CA-01 · Inquilina entra (primer acceso)**

- **Given** `inc_demo` en `VISIT_ASSIGNED`, visita `CONFIRMED` y sesión `PENDING` sin `vonageSessionId`
- **When** `POST /api/video-tokens` con `X-User-Id: usr_tenant_demo`, `X-User-Role: TENANT`, body `{ "incidentId": "inc_demo" }`
- **Then** 200 con `applicationId`, `sessionId` y `token`; la sesión queda `ACTIVE` con `vonageSessionId` guardado

**CA-02 · Técnica entra (sesión ya activa)**

- **Given** la sesión de `inc_demo` está `ACTIVE`
- **When** lo mismo con `usr_technician_demo` / `TECHNICIAN`
- **Then** 200 con la **misma** `sessionId` que la inquilina

**CA-03 · Faltan headers** → **Then** 400
**CA-04 · Incidencia inexistente** (`incidentId: "no_existe"`) → **Then** 404
**CA-05 · Gestora** (`usr_manager_demo` / `MANAGER`) → **Then** 403
**CA-06 · Rol que no coincide** (`usr_tenant_demo` / `TECHNICIAN`) → **Then** 403
**CA-07 · Visita no confirmada** (visita `PENDING`) → **Then** 409
**CA-08 · Sesión terminada** (sesión `ENDED`) → **Then** 409

## 11. Diseño técnico

- `src/routes/video-tokens.ts`: ruta, validación zod y orden de comprobaciones.
- `src/app.ts`: `app.use('/api', videoTokensRouter)`.
- Usa `VideoService` e `IncidentRepo` (interfaces de X1) inyectados, para poder usar los stubs en tests.
- `backend/openapi.yaml`: actualizar la `description` del 409 para incluir la sesión `ENDED`.
- Detalle de capas y cambios en las interfaces: ver `03-plan.md`.

## 12. Estrategia de pruebas

- **Contrato (Supertest):** un test por criterio CA-01 a CA-08, contra `createApp()` con los stubs.
- **Mocks:** `InMemoryVideoService`, `InMemoryIncidentRepo` con datos tipo seed.
- **Negativos:** CA-03 a CA-08.

## 13. Dependencias

- **Hard:** T1 (#31, contrato) y X1 (#30, interfaces y stubs) mergeados.
- **Soft:** A1/A2 (implementación real de Vonage), sustituible por stubs.
- **Librerías:** express, zod, supertest (ya en `backend/package.json`).

## 14. Preguntas abiertas y suposiciones

- **S-01:** Si hay que ampliar `IncidentRepo` para guardar `vonageSessionId` y el estado de la sesión, se coordina con Miranda (autora de X1).
- **S-02:** No se valida la fecha/hora de la visita (`scheduledAt`): se puede entrar en cualquier momento mientras esté `CONFIRMED`. Motivo: el seed programa la visita a +24 h (`seed.ts` L72), así que una ventana horaria bloquearía la demo. **Mejora futura:** añadir una ventana de acceso (p. ej. desde 15 min antes de `scheduledAt`).

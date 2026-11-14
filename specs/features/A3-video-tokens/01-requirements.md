# A3 · POST /api/video-tokens — Requisitos

> Issue: #9 · Rama: `feat/A3-video-tokens` · Contrato: `backend/openapi.yaml` (T1, PR #31)

## 1. Requisitos clasificados

### Explícitos (issue #9, MVP_DEFINITION, contrato T1)

| ID   | Requisito                                                                              | Fuente                        |
| ---- | -------------------------------------------------------------------------------------- | ----------------------------- |
| E-01 | Endpoint `POST /api/video-tokens` en `src/routes/video-tokens.ts`, montado en `app.ts` | Issue #9                      |
| E-02 | Headers obligatorios `X-User-Id` y `X-User-Role`, validados con zod                    | Issue #9                      |
| E-03 | Body `{ incidentId }`                                                                  | Contrato T1 / Mariellys 13/11 |
| E-04 | Respuesta 200 `{ applicationId, sessionId, token }`                                    | Contrato T1                   |
| E-05 | La incidencia debe existir (404 si no)                                                 | Issue #9 / contrato           |
| E-06 | Incidencia en `VISIT_ASSIGNED` y visita en `CONFIRMED` (409 si no)                     | Issue #9 / MVP §3             |
| E-07 | `X-User-Id` debe ser la inquilina o la técnica de esa incidencia (403 si no)           | Issue #9 / MVP §2             |
| E-08 | Sesión de vídeo `ENDED` → 409                                                          | Issue #9                      |
| E-09 | Errores con formato `{ "error": "<mensaje>" }`                                         | Contrato T1                   |
| E-10 | Test de contrato (Supertest): 200, 400, 403, 404, 409                                  | Issue #9                      |

### Derivados

| ID   | Requisito                                                                                             | Justificación                                          |
| ---- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| D-01 | `applicationId` sale de `VONAGE_APPLICATION_ID` (config), no del service                              | El service solo devuelve `{ token, expiresAt }` (X1)   |
| D-02 | Se usan los stubs de X1 (`InMemoryVideoService`, `InMemoryIncidentRepo`) hasta que A1/A2 estén hechas | TASKS.md §10: los carriles no se bloquean gracias a X1 |
| D-03 | `expiresAt` y `apiKey` del criterio original **no** se devuelven                                      | Contrato T1 acordado con Mariellys                     |

## 2. Decisiones de Clarificación Acordadas

| #   | Pregunta                                              | Decisión                                                            | Motivo                                                                                                                                                                       |
| --- | ----------------------------------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1  | ¿Quién puede pedir token?                             | Solo `TENANT` y `TECHNICIAN` **de esa incidencia**. `MANAGER` → 403 | MVP §2: la gestora consulta y recibe SMS, no entra en la llamada                                                                                                             |
| P2  | `X-User-Role` no coincide con el rol real del usuario | **403**                                                             | Es un fallo de autorización, no de formato. El rol va dentro del token; aceptarlo daría acceso con un rol indebido. Ignorarlo ocultaría errores del front. Mínimo privilegio |
| P3  | La sesión no tiene `vonageSessionId`                  | Se **crea** con `VideoService.createSession` y se guarda            | MVP §3 ("la crea el backend al primer acceso") + flujo de Mariellys, paso 6                                                                                                  |
| P4  | Orden de las validaciones                             | 400 → 404 → 403 → 409                                               | Flujo recomendado por Mariellys                                                                                                                                              |
| P5  | ¿Quién pasa la sesión a `ACTIVE`?                     | A3, al entregar el primer token (si está `PENDING`)                 | MVP Escenario 1 ("la sesión pasa a ACTIVE")                                                                                                                                  |

## 3. Fuera de alcance

- Webhook `session.end` y paso a `ENDED` (A4)
- Implementación real de Vonage (A1/A2): aquí se usan los stubs
- Rate limiting (no en MVP)
- Autenticación real (se simula con cabeceras)

## 4. Pendientes detectados

- El 409 del contrato (`openapi.yaml`) no menciona la sesión `ENDED`: actualizar su `description` en el PR de A3.
- La interface `IncidentRepo` de X1 solo tiene `findById` y `updateStatus`. Para P3 y P5 hará falta guardar `vonageSessionId` y cambiar el estado de la sesión: se definirá en `03-plan.md` (coordinar con Miranda si se amplía la interface).

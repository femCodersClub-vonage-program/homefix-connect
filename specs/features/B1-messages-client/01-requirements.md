# B1 · Cliente Vonage Messages (wrapper) — Requisitos

> Issue: #12 · Rama: `feat/B1-messages-client` · Interface: `backend/src/services/messaging.service.ts` (X1)

## 1. Requisitos clasificados

### Explícitos (issue #12, `docs/`, `.env.example`)

| ID   | Requisito | Fuente |
| ---- | --------- | ------ |
| E-01 | `src/services/messaging.service.ts` exporta `VonageMessagesClient` con `sendSms(to, body) → { providerMessageId }` | Issue #12 |
| E-02 | El remitente sale de `VONAGE_MESSAGES_FROM` | Issue #12 · `.env.example` |
| E-03 | Errores tipados: `VonageAuthError`, `VonageNetworkError`, `VonageValidationError` | Issue #12 |
| E-04 | Test unitario que **no** llama a Vonage real | Issue #12 |
| E-05 | Loguea request/response sin el body completo del SMS | Issue #12 · `backend/AGENTS.md` (logs por evento) |
| E-06 | `providerMessageId` = `message_uuid` de la respuesta de Vonage | Issue #12 (decisión propuesta) |
| E-07 | Los teléfonos destino salen de `User.phone` (seed: `+346000000xx`) | `.env.example` · ARCHITECTURE |
| E-08 | Reintentos en 429/5xx **no** son de B1: se deciden en B3/B5 | Issue #12 · ARCHITECTURE (riesgos) |

### Derivados

| ID   | Requisito | Justificación |
| ---- | --------- | ------------- |
| D-01 | `VonageMessagesClient` cumple la interface `MessagingService` de X1 | Misma firma `sendSms(to, body)` |
| D-02 | El cliente del SDK se inyecta en el constructor para mockearlo en tests (igual que A2) | AGENTS.md: llamadas a Vonage detrás de un service testeable |
| D-03 | Sin credenciales la app arranca; `sendSms` falla con error claro | `.env.example` («la app arranca y las rutas… fallan al usarlas»), mismo criterio que A2 |
| D-04 | En los logs el teléfono va enmascarado (p. ej. `+34*****001`) | AGENTS.md §9.1: sin teléfonos reales |
| D-05 | El service no importa `express` ni sabe de HTTP | `backend/AGENTS.md` (capa `services/`) |

## 2. Hallazgos al revisar la documentación de Vonage

Según la documentación oficial de la Messages API (developer.vonage.com/en/messages/technical-details):

- El envío es `vonage.messages.send(...)` con `channel: 'sms'` y `messageType: 'text'`; el SDK devuelve `{ messageUUID }` (la API REST lo llama `message_uuid`). Verificado en `@vonage/server-sdk` 3.31.1.
- La Messages API admite **JWT** (`applicationId` + `privateKey`, las mismas credenciales que A2) o **Basic** (`apiKey` + `apiSecret`). Vonage recomienda JWT; con JWT los recibos de entrega van al webhook de la aplicación y con Basic al de la cuenta.
- El SDK de A2 (`@vonage/server-sdk`) ya incluye `messages`. Ese paquete entró con el PR de A2 (#40), mergeado el 20/11.
- ✅ **Formato del número (confirmado en la referencia de la API y en el soporte de Vonage):** E.164 **sin** `+` ni `00`, empezando por el código de país (p. ej. `447700900000`). Como `User.phone` del seed va con `+` (`+34600000001`), el wrapper valida E.164 con `+` y quita el `+` antes de llamar a Vonage.

## 3. Desconocidos (preguntas para el issue)

| #  | Pregunta | Opciones | Recomendación |
| -- | -------- | -------- | ------------- |
| Q1 | Autenticación | A) JWT con `VONAGE_APPLICATION_ID` + `private.key` (como A2) · B) Basic con `VONAGE_API_KEY` / `VONAGE_API_SECRET` | **A**: reutiliza las credenciales de A2 y es lo que recomienda Vonage. Requiere activar *Messages* en la aplicación de Vonage |
| Q2 | ¿El wrapper valida `to` antes de llamar a Vonage? | A) Sí: E.164 (`^\+[1-9]\d{6,14}$`) → `VonageValidationError` sin llamar al SDK · B) No: lo valida Vonage | **A**: error claro y test sin red. El wrapper quita el `+` antes de llamar a Vonage (ver hallazgo ✅) |
| Q3 | Mock en los tests | A) Inyectar el cliente del SDK y mockearlo con Vitest (como A2) · B) `nock` / `msw` (lo que dice el issue) | **A**: no añade dependencias nuevas (AGENTS.md §12 prohíbe añadirlas sin PR aprobado) |
| Q4 | Mapeo de errores | 401/403 → `VonageAuthError` · 400/422 → `VonageValidationError` · 429, 5xx, timeout, sin red → `VonageNetworkError` | Confirmar. 429 va con *network* porque es reintentable (B3) |
| Q5 | Falta `VONAGE_MESSAGES_FROM` o credenciales | A) Fallar al arrancar · B) La app arranca y `sendSms` lanza `VonageAuthError` | **B**, igual que A2 |
| Q6 | ¿B1 conecta el cliente en `app.ts`? | A) Sí · B) No: B1 solo entrega el cliente; lo conecta B2/B3 | **B**: B1 es el wrapper; quien lo usa es B2/B3 |
| Q7 | Dependencia del SDK (viene con A2, #40) | A) Esperar a que se mergee A2 y rebasar · B) Basar B1 en la rama de A2 (stacked) | **A**: spec y plan ya; el código, cuando A2 esté en `main` |
| Q8 | Import del SDK: `@vonage/messages` no está en el `package.json` del backend (pnpm no deja importar `SMS`) | A) Objeto plano a `vonage.messages.send(...)` sin dependencias nuevas · B) Añadir `@vonage/messages` y usar la clase `SMS` | — |

## 4. Decisiones de Clarificación Acordadas

Decididas por Carolina (asignada de la B1) el 20/11/2026 y anotadas en el #12.

| #  | Decisión |
| -- | -------- |
| Q1 | ✅ **A · JWT** con `VONAGE_APPLICATION_ID` + `private.key`: la misma aplicación de Vonage que A2 (`homefix-connect-dev`). Hay que activar *Messages* en esa aplicación (sin regenerar la clave) |
| Q2 | ✅ **A** · El wrapper valida E.164 con `+` (`^\+[1-9]\d{6,14}$`), lanza `VonageValidationError` sin llamar al SDK y quita el `+` antes de enviar |
| Q3 | ✅ **A** · Cliente del SDK inyectado y mockeado con Vitest; sin nock/msw |
| Q4 | ✅ 401/403 → `VonageAuthError` · 400/422 → `VonageValidationError` · 429, 5xx, timeout y red → `VonageNetworkError`. Reintentos → B3 |
| Q5 | ✅ **B** · La app arranca; `sendSms` lanza `VonageAuthError` si faltan credenciales o `VONAGE_MESSAGES_FROM` |
| Q6 | ✅ **B** · B1 solo entrega el cliente; lo conecta B2/B3 |
| Q7 | ✅ Resuelta: #40 (A2) mergeado en `main` el 20/11 |
| Q8 | ✅ Se añade `@vonage/messages` como dependencia directa del backend, **misma versión que trae `@vonage/server-sdk` (1.28.1)**, y el mensaje se construye con la clase `SMS`. `sendSms` devuelve el id del mensaje (`messageUUID` → `providerMessageId`). Dependencia nueva declarada en el PR (AGENTS.md §12) |

## 5. Fuera de alcance

- Plantilla del SMS post-visita y `MessagingService.sendSms` de negocio (B2).
- `sendPostVisit`, registros `Notification` y reintentos (B3).
- Webhook `message.status` (B4, post-MVP).
- Contract tests (B5).

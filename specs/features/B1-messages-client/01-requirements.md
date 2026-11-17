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

- El envío es `vonage.messages.send({ messageType: 'sms', channel: 'sms', to, from, text })` y la respuesta trae `messageUUID`.
- La Messages API admite **JWT** (`applicationId` + `privateKey`, las mismas credenciales que A2) o **Basic** (`apiKey` + `apiSecret`). Vonage recomienda JWT; con JWT los recibos de entrega van al webhook de la aplicación y con Basic al de la cuenta.
- El SDK de A2 (`@vonage/server-sdk`) ya incluye `messages`. Ese paquete entra con el PR de A2 (#40), que aún no está mergeado.
- ⚠️ **Por confirmar:** creo que la Messages API pide el número en E.164 **sin** el `+` inicial. Hay que comprobarlo en la referencia de la API o en la prueba real antes de fijarlo.

## 3. Desconocidos (preguntas para el issue)

| #  | Pregunta | Opciones | Recomendación |
| -- | -------- | -------- | ------------- |
| Q1 | Autenticación | A) JWT con `VONAGE_APPLICATION_ID` + `private.key` (como A2) · B) Basic con `VONAGE_API_KEY` / `VONAGE_API_SECRET` | **A**: reutiliza las credenciales de A2 y es lo que recomienda Vonage. Requiere activar *Messages* en la aplicación de Vonage |
| Q2 | ¿El wrapper valida `to` antes de llamar a Vonage? | A) Sí: E.164 (`^\+[1-9]\d{6,14}$`) → `VonageValidationError` sin llamar al SDK · B) No: lo valida Vonage | **A**: error claro y test sin red. El wrapper adapta el formato que pida Vonage (ver hallazgo ⚠️) |
| Q3 | Mock en los tests | A) Inyectar el cliente del SDK y mockearlo con Vitest (como A2) · B) `nock` / `msw` (lo que dice el issue) | **A**: no añade dependencias nuevas (AGENTS.md §12 prohíbe añadirlas sin PR aprobado) |
| Q4 | Mapeo de errores | 401/403 → `VonageAuthError` · 400/422 → `VonageValidationError` · 429, 5xx, timeout, sin red → `VonageNetworkError` | Confirmar. 429 va con *network* porque es reintentable (B3) |
| Q5 | Falta `VONAGE_MESSAGES_FROM` o credenciales | A) Fallar al arrancar · B) La app arranca y `sendSms` lanza `VonageAuthError` | **B**, igual que A2 |
| Q6 | ¿B1 conecta el cliente en `app.ts`? | A) Sí · B) No: B1 solo entrega el cliente; lo conecta B2/B3 | **B**: B1 es el wrapper; quien lo usa es B2/B3 |
| Q7 | Dependencia del SDK (viene con A2, #40) | A) Esperar a que se mergee A2 y rebasar · B) Basar B1 en la rama de A2 (stacked) | **A**: spec y plan ya; el código, cuando A2 esté en `main` |

## 4. Decisiones de Clarificación Acordadas

_Pendiente de respuesta en el issue #12._

## 5. Fuera de alcance

- Plantilla del SMS post-visita y `MessagingService.sendSms` de negocio (B2).
- `sendPostVisit`, registros `Notification` y reintentos (B3).
- Webhook `message.status` (B4, post-MVP).
- Contract tests (B5).

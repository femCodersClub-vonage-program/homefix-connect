# B1 · Cliente Vonage Messages (wrapper) — Especificación

> Issue: #12 · Rama: `feat/B1-messages-client` · Interface: `backend/src/services/messaging.service.ts` (X1) · Requisitos: `01-requirements.md` · Estado: borrador

## 1. Resumen y contexto

<!-- Qué es el wrapper, para qué lo usarán B2/B3 y de qué depende (A2 / SDK). -->

La B1 implementa `VonageMessagesClient`, el cliente (wrapper) que habla con la Messages API de Vonage. Tiene un método, `sendSms`, que recibe `to` (el número de destino) y `body` (el texto del SMS) y devuelve `{ providerMessageId }`.

La B1 la usará la B2, que implementa `MessagingService.sendSms` y la plantilla del SMS post-visita, y después la B3, que implementa `sendPostVisit` y guarda los registros `Notification`. Al final del flujo, cuando termina la videollamada, se envían 2 SMS: uno al gestor y otro a la inquilina.

La B1 no se conecta en `app.ts` (eso lo hace la B2/B3) y no hace reintentos si falla el envío (quedan para la B3).

Para programarla hace falta el SDK `@vonage/server-sdk`, que llega con el #40 (A2), por eso la spec y el plan se escriben ya y el código se programa cuando el #40 esté en `main`.

## 2. Alcance

<!-- Qué entra y qué no (Q6: no conecta en app.ts). -->

**Entra:**

- La clase `VonageMessagesClient` con el método `sendSms`.
- La validación del número en formato E.164 antes de llamar a Vonage.
- Los errores tipados: `VonageAuthError`, `VonageValidationError` y `VonageNetworkError`.
- Un test unitario que verifica el comportamiento de `sendSms` y el manejo de errores con el cliente del SDK mockeado, sin llamar a Vonage real.

**No entra:**

- Conectar el cliente en `app.ts` (→ B2/B3).
- Los reintentos si falla el envío (→ B3).
- La plantilla del SMS post-visita (→ B2).
- Guardar los registros `Notification` en la BD (→ B3).

## 3. Requisitos funcionales

<!-- RF-1, RF-2... a partir de los explícitos y derivados del 01. -->

| ID    | Requisito                                                                                                          | Fuente                                 |
| ----- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------- |
| RF-1  | `src/services/messaging.service.ts` exporta `VonageMessagesClient` con `sendSms(to, body) → { providerMessageId }` | E-01 · Issue #12                       |
| RF-2  | El remitente sale de `VONAGE_MESSAGES_FROM`                                                                        | E-02 · Issue #12 · `.env.example`      |
| RF-3  | `VonageMessagesClient` cumple la interface `MessagingService` de X1                                                | D-01 · X1                              |
| RF-4  | Errores tipados: `VonageAuthError`, `VonageNetworkError`, `VonageValidationError`                                  | E-03 · Issue #12                       |
| RF-5  | Test unitario que **no** llama a Vonage real                                                                       | E-04 · Issue #12                       |
| RF-6  | Loguea request/response sin el body completo del SMS                                                               | E-05 · Issue #12 · `backend/AGENTS.md` |
| RF-7  | `providerMessageId` = `message_uuid` de la respuesta de Vonage                                                     | E-06 · Issue #12                       |
| RF-8  | El cliente del SDK se inyecta en el constructor para mockearlo en tests                                            | D-02 · `AGENTS.md`                     |
| RF-9  | Sin credenciales la app arranca; `sendSms` falla con error claro                                                   | D-03 · `.env.example` · Q5             |
| RF-10 | En los logs el teléfono va enmascarado (p. ej. `+34*****001`)                                                      | D-04 · `AGENTS.md` §9.1                |
| RF-11 | El service no importa `express` ni sabe de HTTP                                                                    | D-05 · `backend/AGENTS.md`             |

## 4. Reglas de negocio

<!-- E.164 con + en la entrada, sin + hacia Vonage; credenciales; etc. -->

- **Número de destino:** se recibe en formato E.164 con `+` y se envía a Vonage sin el `+` (el wrapper lo quita).
- **Remitente:** sale siempre de `VONAGE_MESSAGES_FROM`.
- **Autenticación:** JWT con `VONAGE_APPLICATION_ID` + `private.key` (⏳ pendiente Q1).
- **Privacidad en logs:** no se loguea el body completo del SMS y el teléfono va enmascarado (p. ej. `+34*****001`).

## 5. Contrato (firma pública del wrapper)

<!-- Firma de sendSms (parámetros y lo que devuelve). -->

```ts
class VonageMessagesClient implements MessagingService {
  constructor(client: VonageClient, from: string);
  sendSms(to: string, body: string): Promise<{ providerMessageId: string }>;
}
```

> ⚠️ Pendiente de verificar en el SDK (cuando #40 esté en `main`): el nombre exacto del tipo del cliente (`VonageClient`).

- `to`: número en formato E.164 con `+`.
- `body`: contenido del SMS.
- Devuelve `providerMessageId`, que es el `message_uuid` de la respuesta.

## 6. Manejo de errores

<!-- Tabla: caso → error lanzado (Q4: auth / validación / network). -->

| Caso                                              | Error que lanza `sendSms`           |
| ------------------------------------------------- | ----------------------------------- |
| Número `to` que no es E.164 (sin llamar a Vonage) | `VonageValidationError`             |
| Vonage responde 401 o 403                         | `VonageAuthError`                   |
| Vonage responde 400 o 422                         | `VonageValidationError`             |
| Vonage responde 429 o 5xx                         | `VonageNetworkError`                |
| Fallo de red o timeout                            | `VonageNetworkError`                |
| Faltan credenciales                               | `VonageAuthError` (⏳ pendiente Q5) |

## 7. Casos límite

<!-- Sin credenciales (Q5), número inválido, timeout, 429... -->

| Caso                                         | Qué pasa                                                         |
| -------------------------------------------- | ---------------------------------------------------------------- |
| `to` sin `+` (p. ej. `34600000001`)          | `VonageValidationError` (no cumple la regex de Q2)               |
| `to` con espacios (p. ej. `+34 600 000 001`) | `VonageValidationError` (no cumple la regex de Q2)               |
| `body` vacío                                 | `VonageValidationError` sin llamar a Vonage ⏳                   |
| `body` de más de 160 caracteres              | Se envía igual; Vonage lo parte en varios SMS ⏳ (por verificar) |
| Falta `VONAGE_MESSAGES_FROM`                 | `VonageAuthError` (Q5)                                           |
| Vonage responde OK pero sin `message_uuid`   | `VonageNetworkError` ⏳                                          |

## 8. Criterios de aceptación

<!-- Lista verificable, idealmente Dado / Cuando / Entonces. -->

- [ ] **CA-1 · Envío correcto:** Dado un `to` E.164 válido y un `body`, cuando llamo a `sendSms`, entonces el SDK recibe el número **sin `+`**, el remitente de `VONAGE_MESSAGES_FROM`, y devuelve `{ providerMessageId }` igual al `message_uuid`.
- [ ] **CA-2 · Número inválido:** Dado un `to` que no cumple E.164 (sin `+`, con espacios…), cuando llamo a `sendSms`, entonces lanza `VonageValidationError` y **no** se llama al SDK.
- [ ] **CA-3 · Body vacío:** Dado un `body` vacío, cuando llamo a `sendSms`, entonces lanza `VonageValidationError` y **no** se llama al SDK.
- [ ] **CA-4 · Auth:** Dado que Vonage responde 401 o 403, entonces lanza `VonageAuthError`.
- [ ] **CA-5 · Validación Vonage:** Dado que Vonage responde 400 o 422, entonces lanza `VonageValidationError`.
- [ ] **CA-6 · Red:** Dado que Vonage responde 429, 5xx, hay timeout o error de red, entonces lanza `VonageNetworkError`.
- [ ] **CA-7 · Sin credenciales:** Dado que faltan credenciales o `VONAGE_MESSAGES_FROM`, la app arranca y `sendSms` lanza `VonageAuthError`.
- [ ] **CA-8 · Logs:** Los logs no incluyen el `body` completo y el teléfono aparece enmascarado.
- [ ] **CA-9 · Tests:** Los tests usan el cliente del SDK mockeado y no llaman a Vonage real.
- [ ] **CA-10 · Calidad:** `pnpm check` y `pnpm test` pasan sin errores.

## 9. Diseño técnico

<!-- Archivo(s), cómo se inyecta el cliente (Q3), dónde se leen las credenciales. -->

## 10. Decisiones (Q1–Q7)

<!-- Cada Q con estado: ✅ decidido / ⏳ pendiente de respuesta en el #12. -->

- **Q1 · Autenticación:** JWT con `VONAGE_APPLICATION_ID` + `private.key` (las mismas credenciales que A2; lo recomienda Vonage). Requiere activar _Messages_ en la aplicación de Vonage. Alternativa: Basic con `VONAGE_API_KEY` / `VONAGE_API_SECRET`. · ⏳ pendiente
- **Q2 · Validar `to`:** el wrapper valida E.164 y lanza `VonageValidationError` sin llamar a Vonage. Como Vonage quiere el número sin `+`, el wrapper valida con `+` y lo quita antes de enviar. · ⏳ pendiente
- **Q3 · Mock en tests:** se inyecta el cliente del SDK y se mockea con Vitest (como en A2), sin dependencias nuevas (nock/msw no están en el proyecto). · ⏳ pendiente
- **Q4 · Mapeo de errores:** 401/403 → `VonageAuthError` · 400/422 → `VonageValidationError` · 429, 5xx y errores de red → `VonageNetworkError`. Los reintentos quedan para B3. · ⏳ pendiente
- **Q5 · Sin credenciales:** la app arranca y `sendSms` lanza error (mismo criterio que A2). · ⏳ pendiente
- **Q6 · Alcance:** B1 solo entrega el cliente; lo conecta en `app.ts` la B2/B3. · ⏳ pendiente
- **Q7 · Dependencia:** el SDK entra con A2 (#40). Spec y plan ya; el código cuando A2 esté en `main`. · ⏳ pendiente

## 11. Estrategia de pruebas

<!-- Unit con Vitest + cliente mockeado; qué casos se prueban. -->

## 12. Dependencias

<!-- #40 (A2) en main por el SDK; activar Messages en la app de Vonage. -->

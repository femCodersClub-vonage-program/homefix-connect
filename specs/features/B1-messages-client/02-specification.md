# B1 · Cliente Vonage Messages (wrapper) — Especificación

> Issue: #12 · Rama: `feat/B1-messages-client` · Interface: `backend/src/services/messaging.service.ts` (X1) · Requisitos: `01-requirements.md` · Estado: decisiones Q1–Q8 cerradas (20/11)

## 1. Resumen y contexto

<!-- Qué es el wrapper, para qué lo usarán B2/B3 y de qué depende (A2 / SDK). -->

La B1 implementa `VonageMessagesClient`, el cliente (wrapper) que habla con la Messages API de Vonage. Tiene un método, `sendSms`, que recibe `to` (el número de destino) y `body` (el texto del SMS) y devuelve `{ providerMessageId }`.

La B1 la usará la B2, que implementa `MessagingService.sendSms` y la plantilla del SMS post-visita, y después la B3, que implementa `sendPostVisit` y guarda los registros `Notification`. Al final del flujo, cuando termina la videollamada, se envían 2 SMS: uno al gestor y otro a la inquilina.

La B1 no se conecta en `app.ts` (eso lo hace la B2/B3) y no hace reintentos si falla el envío (quedan para la B3).

Usa el SDK `@vonage/server-sdk` (entró con el #40, A2, ya en `main`) y añade `@vonage/messages` para construir el SMS con la clase `SMS` (Q8).

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
| RF-7  | `providerMessageId` = id del mensaje de Vonage (`messageUUID` en el SDK; `message_uuid` en la API REST)             | E-06 · Issue #12 · Q8                  |
| RF-8  | El cliente del SDK se inyecta en el constructor para mockearlo en tests                                            | D-02 · `AGENTS.md`                     |
| RF-9  | Sin credenciales la app arranca; `sendSms` falla con error claro                                                   | D-03 · `.env.example` · Q5             |
| RF-10 | En los logs el teléfono va enmascarado (p. ej. `+34*****001`)                                                      | D-04 · `AGENTS.md` §9.1                |
| RF-11 | El service no importa `express` ni sabe de HTTP                                                                    | D-05 · `backend/AGENTS.md`             |

## 4. Reglas de negocio

<!-- E.164 con + en la entrada, sin + hacia Vonage; credenciales; etc. -->

- **Número de destino:** se recibe en formato E.164 con `+` y se envía a Vonage sin el `+` (el wrapper lo quita).
- **Remitente:** sale siempre de `VONAGE_MESSAGES_FROM`.
- **Autenticación:** JWT con `VONAGE_APPLICATION_ID` + `private.key`, misma aplicación que A2 (Q1 ✅).
- **Privacidad en logs:** no se loguea el body completo del SMS y el teléfono va enmascarado (p. ej. `+34*****001`).

## 5. Contrato (firma pública del wrapper)

<!-- Firma de sendSms (parámetros y lo que devuelve). -->

```ts
class VonageMessagesClient implements MessagingService {
  constructor(options: { client: VonageMessagesSdk; from: string });
  sendSms(to: string, body: string): Promise<{ providerMessageId: string }>;
}
```

> `VonageMessagesSdk` es el tipo mínimo de lo que usamos de `vonage.messages` (método `send` → `{ messageUUID }`), igual que `VonageVideoClient` en A2. Constructor con objeto de opciones, como A2.

- `to`: número en formato E.164 con `+`.
- `body`: contenido del SMS.
- Devuelve `providerMessageId`, que es el id del mensaje que devuelve Vonage (`messageUUID`).

## 6. Manejo de errores

<!-- Tabla: caso → error lanzado (Q4: auth / validación / network). -->

| Caso                                              | Error que lanza `sendSms`           |
| ------------------------------------------------- | ----------------------------------- |
| Número `to` que no es E.164 (sin llamar a Vonage) | `VonageValidationError`             |
| Vonage responde 401 o 403                         | `VonageAuthError`                   |
| Vonage responde 400 o 422                         | `VonageValidationError`             |
| Vonage responde otro 4xx (404, 409, 413…)         | `VonageValidationError` (Q4+, 20/11) |
| Vonage responde 429 o 5xx                         | `VonageNetworkError`                |
| Fallo de red o timeout                            | `VonageNetworkError`                |
| Cualquier otro error sin código HTTP              | `VonageNetworkError` (Q4+, 20/11)   |
| Faltan credenciales o `VONAGE_MESSAGES_FROM`      | `VonageAuthError` (Q5 ✅)           |

## 7. Casos límite

<!-- Sin credenciales (Q5), número inválido, timeout, 429... -->

| Caso                                         | Qué pasa                                                         |
| -------------------------------------------- | ---------------------------------------------------------------- |
| `to` sin `+` (p. ej. `34600000001`)          | `VonageValidationError` (no cumple la regex de Q2)               |
| `to` con espacios (p. ej. `+34 600 000 001`) | `VonageValidationError` (no cumple la regex de Q2)               |
| `body` vacío o solo espacios                 | `VonageValidationError` sin llamar a Vonage                      |
| `body` de más de 160 caracteres              | Se envía igual; Vonage lo parte en varios SMS ⏳ (por verificar) |
| Falta `VONAGE_MESSAGES_FROM`                 | `VonageAuthError` (Q5)                                           |
| Vonage responde OK pero sin `messageUUID`    | `VonageNetworkError`                                             |

## 8. Criterios de aceptación

<!-- Lista verificable, idealmente Dado / Cuando / Entonces. -->

- [ ] **CA-1 · Envío correcto:** Dado un `to` E.164 válido y un `body`, cuando llamo a `sendSms`, entonces el SDK recibe el número **sin `+`**, el remitente de `VONAGE_MESSAGES_FROM`, y devuelve `{ providerMessageId }` igual al `messageUUID` de la respuesta.
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

- `src/services/messaging.service.ts`:
  - Tipo mínimo `VonageMessagesSdk = { send(msg: SMS): Promise<{ messageUUID?: string }> }` (`messageUUID` opcional para cubrir el caso «respuesta sin id») (lo que usamos del SDK; fácil de mockear).
  - `class VonageMessagesClient implements MessagingService`, constructor `({ client, from })`.
  - `sendSms`: valida `to` (regex de Q2) y `body`, quita el `+`, construye el mensaje con `new SMS({ to, from, text })` de `@vonage/messages` (Q8), llama a `client.send(...)`, mapea errores (apartado 6) y devuelve `{ providerMessageId }`.
  - `createVonageMessagesClient({ applicationId, privateKeyPath, from })` (como `createVonageVideoService` en A2; B2/B3 le pasan `env.VONAGE_APPLICATION_ID`, `env.VONAGE_PRIVATE_KEY_PATH` y `env.VONAGE_MESSAGES_FROM`): si hay credenciales y remitente, crea el cliente real del SDK en la primera llamada; si no, `sendSms` lanza `VonageAuthError` (Q5). También lanza `VonageAuthError` si la ruta del `private.key` no existe.
- Errores (`VonageAuthError`, `VonageValidationError`, `VonageNetworkError`): en `src/lib/vonage-errors.ts` (decidido en el plan).
- Credenciales: se leen de `src/config/env.ts` (ya existen, opcionales).
- **No** se toca `src/app.ts` (Q6).

> ✅ Verificado en el SDK (`@vonage/server-sdk` 3.31.1 / `@vonage/messages` 1.28.1): `messages.send(...)` devuelve `{ messageUUID }` y `@vonage/messages` exporta la clase `SMS`.
> ✅ Verificado (20/11): ante una respuesta de error el SDK lanza `VetchError` (`@vonage/vetch`) con el código HTTP en `error.response.status`. Error de red: sin `response`. Timeout: `AbortError`.
> El SMS se construye con `new SMS(text, to, from)` (constructor posicional): el de objeto exige pasar también `channel` y `messageType` en los tipos.

## 10. Decisiones (Q1–Q8)

<!-- Cada Q con estado: ✅ decidido / ⏳ pendiente de respuesta en el #12. -->

Decididas el 20/11/2026 y anotadas en el #12.

- **Q1 · Autenticación:** JWT con `VONAGE_APPLICATION_ID` + `private.key`, la misma aplicación de Vonage que A2 (`homefix-connect-dev`). Hay que activar _Messages_ en esa aplicación sin regenerar la clave. · ✅
- **Q2 · Validar `to`:** el wrapper valida E.164 con `+`, lanza `VonageValidationError` sin llamar a Vonage y quita el `+` antes de enviar. · ✅
- **Q3 · Mock en tests:** cliente del SDK inyectado y mockeado con Vitest (como en A2); sin nock/msw. · ✅
- **Q4 · Mapeo de errores:** 401/403 → `VonageAuthError` · 400/422 → `VonageValidationError` · 429, 5xx y errores de red → `VonageNetworkError`. Reintentos → B3. · ✅
  - **Ampliación (20/11):** resto de 4xx → `VonageValidationError` (la petición está mal, no se reintenta); cualquier error sin código HTTP → `VonageNetworkError`. Así B3 solo ve 3 tipos: auth (no reintentar), validación (no reintentar), red (reintentable). · ✅
- **Q5 · Sin credenciales:** la app arranca y `sendSms` lanza `VonageAuthError` (también si falta `VONAGE_MESSAGES_FROM`). · ✅
- **Q6 · Alcance:** B1 solo entrega el cliente; lo conecta en `app.ts` la B2/B3. · ✅
- **Q7 · Dependencia:** resuelta, #40 (A2) en `main` el 20/11. · ✅
- **Q8 · Import del SDK:** se añade `@vonage/messages` como dependencia directa del backend en la versión que ya trae `@vonage/server-sdk` (1.28.1) y se usa la clase `SMS`. `sendSms` devuelve el id del mensaje (`messageUUID` → `providerMessageId`). Se declara en el PR como dependencia nueva (AGENTS.md §12). · ✅

## 11. Estrategia de pruebas

<!-- Unit con Vitest + cliente mockeado; qué casos se prueban. -->

- **Unit (Vitest)** en `src/__tests__/`, con el cliente del SDK mockeado e inyectado en el constructor (Q3). Sin red y sin dependencias nuevas.
- Un test por criterio de aceptación: CA-1 a CA-8 (apartado 8).
- Se comprueba también que en los casos de validación (CA-2, CA-3) **no** se llama al mock del SDK.
- Prueba manual opcional contra Vonage real con la app `homefix-connect-dev`, si se activa _Messages_ y el saldo permite enviar SMS a números españoles ⏳.
- Antes del PR: `pnpm check` + `pnpm test` en verde.

## 12. Dependencias

<!-- #40 (A2) en main por el SDK; activar Messages en la app de Vonage. -->

- **#40 (A2) en `main`** ✅: trae el SDK `@vonage/server-sdk`.
- **`@vonage/messages` 1.28.1** como dependencia directa del backend (Q8).
- **Decisiones Q1–Q8** ✅ (20/11).
- **Activar _Messages_** en la aplicación `homefix-connect-dev` de Vonage (Q1), para la prueba manual.
- **T1 y T2** (contrato OpenAPI y Prisma): ya en `main` ✅.
- **Bloquea a:** B2 (`MessagingService.sendSms` + plantilla).

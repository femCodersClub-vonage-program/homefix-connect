# B1 · Cliente Vonage Messages (wrapper) — Validación

> Spec: [`02-specification.md`](./02-specification.md) · Plan: [`03-plan.md`](./03-plan.md) · Issue: #12

## Resultado de los tests

Rama `feat/B1-messages-client` (con `main` mergeado, incluye A2 #40 y #41), 20/11, en local (Windows, PowerShell):

```text
$ pnpm check
$ pnpm lint && pnpm typecheck
$ eslint .
frontend typecheck$ tsc --noEmit -p tsconfig.json  → Done
backend typecheck$ tsc --noEmit -p tsconfig.json   → Done

$ pnpm test
backend:  Test Files  7 passed (7) · Tests  88 passed (88)
          (de ellos, 24 en src/__tests__/vonage-messages.client.test.ts)
frontend: Test Files  3 passed (3) · Tests  15 passed (15)
```

## Criterios de aceptación

| Criterio | Test (`vonage-messages.client.test.ts`) | Resultado |
|---|---|---|
| CA-1 · Envío correcto: SDK recibe el número sin `+`, el remitente de config, `channel: 'sms'`, `messageType: 'text'`; devuelve `providerMessageId` = `messageUUID` | 1 test | ✅ |
| CA-2 · Número no E.164 (sin `+`, con espacios, con letras, vacío) → `VonageValidationError` sin llamar al SDK | 4 tests | ✅ |
| CA-3 · Body vacío → `VonageValidationError` sin llamar al SDK | 1 test | ✅ |
| CA-4 · 401 / 403 → `VonageAuthError` | 2 tests | ✅ |
| CA-5 · 400 / 422 y resto de 4xx (404, 409, 413) → `VonageValidationError` | 5 tests | ✅ |
| CA-6 · 429, 500, 503, error de red, timeout, error desconocido y respuesta sin `messageUUID` → `VonageNetworkError` | 7 tests | ✅ |
| CA-7 · Falta `applicationId`, `privateKeyPath` o `VONAGE_MESSAGES_FROM`: el cliente se crea sin error y `sendSms` lanza `VonageAuthError` | 3 tests | ✅ |
| CA-8 · Los logs no llevan el body del SMS ni el teléfono completo (enmascarado `+34******001`) | 1 test | ✅ |
| CA-9 · Los tests usan el cliente del SDK mockeado (sin red ni credenciales) | Todo el archivo | ✅ |
| CA-10 · `pnpm check` y `pnpm test` en verde | Ver arriba | ✅ |
| `createVonageMessagesClient` con config completa: SDK creado con JWT en el primer envío, delega en `messages.send` y se reutiliza (review de Copilot en el #43) | `vonage-messages.factory.test.ts` (2 tests) | ✅ |
| Prueba manual contra Vonage real (SMS real) | — | ⏳ Pendiente: la cuenta no tiene número para `VONAGE_MESSAGES_FROM` |

## Proceso TDD

1. `docs(B1): record Q1-Q8 decisions` (`ce6536b`): spec y plan con Q1–Q8 cerradas.
2. `chore(messaging): add @vonage/messages for B1` (`5ead722`): dependencia de Q8, versión 1.28.1 (la que ya trae `@vonage/server-sdk`).
3. Fase roja: `vonage-errors.ts` + `vonage-messages.client.test.ts` → 20 tests en rojo (`VonageMessagesClient is not a constructor`); el resto del suite seguía en verde.
4. Fase verde: `VonageMessagesClient` y `createVonageMessagesClient` en `messaging.service.ts` → 24/24. Se añadieron los casos de la ampliación de Q4 (404/409/413 y error desconocido).
5. Fases roja y verde subidas en un único commit: `feat(messaging): add VonageMessagesClient (B1)` (`4434e8c`).

6. Review de Copilot en el #43: faltaba cubrir el camino feliz de la factoría. Nuevo `vonage-messages.factory.test.ts` (SDK y `node:fs` mockeados, en archivo aparte porque `vi.mock` afecta a todo el archivo) → backend 90/90.

## Hallazgos durante la implementación

- Ante una respuesta de error, el SDK lanza `VetchError` (`@vonage/vetch`) con el código HTTP en `error.response.status`. Un fallo de red no trae `response` y un timeout llega como `AbortError`.
- `messages.send()` devuelve `{ messageUUID }` (lo saca de `message_uuid` de la API REST).
- El constructor de `SMS` con objeto exige en los tipos `channel` y `messageType`; se usa el posicional `new SMS(text, to, from)`, que los rellena solo.
- Igual que en A2: si el `private.key` no existe, se lanza `VonageAuthError` antes de crear el SDK (si no, el SDK usaría el texto de la ruta como clave).
- El mapeo de Q4 no cubría todos los códigos: se amplió (resto de 4xx → validación; sin código HTTP → red). Ver spec §6 y §10.

## Pendientes

- Prueba manual con un SMS real: falta decidir qué va en `VONAGE_MESSAGES_FROM` (la cuenta no tiene número de Vonage) y comprobar el saldo.
- Conectar el cliente en la app: lo hace B2/B3 (Q6).
- `body` de más de 160 caracteres: se envía y Vonage lo parte (sin verificar).

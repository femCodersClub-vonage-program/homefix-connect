# B1 · Cliente Vonage Messages — Plan de implementación

> Spec: [`02-specification.md`](./02-specification.md) · Issue: #12 · Estado: borrador

## 1. Ficheros afectados

<!-- Tabla: etiqueta [NEW]/[MODIFY] · fichero · qué y por qué. -->

| Etiqueta   | Fichero                                                | Qué y por qué                                                                                  |
| ---------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `[MODIFY]` | `backend/src/services/messaging.service.ts`            | Añadir `VonageMessagesClient`, el tipo `VonageMessagesSdk` y `createVonageMessagesClient(env)` |
| `[NEW]`    | `backend/src/__tests__/vonage-messages.client.test.ts` | Tests CA-1 a CA-8 con cliente mockeado                                                         |
| `[NEW]`    | `backend/src/lib/vonage-errors.ts`                     | Los 3 errores tipados, para que B2/B3 los importen sin depender del cliente                    |

Sin cambios en `app.ts` (Q6), `openapi.yaml` ni `schema.prisma`.

## 2. Estrategia de pruebas (TDD)

<!-- Fase roja, fase verde y dobles de prueba (cliente mockeado). -->

**Fase roja:** escribir `vonage-messages.client.test.ts` con los criterios CA-1 a CA-8 → fallan porque aún no existe `VonageMessagesClient` ni la función `createVonageMessagesClient`.

**Fase verde:** implementar `VonageMessagesClient`, el tipo `VonageMessagesSdk` y `createVonageMessagesClient(env)` y los errores de `vonage-errors.ts`, hasta que pasen.

**Dobles de prueba:**

- Cliente falso: `{ send: vi.fn().mockResolvedValue({ messageUUID: 'msg-123' }) }`.
- Para los errores: `send: vi.fn().mockRejectedValue(...)` con el código HTTP de cada caso (401, 403, 400, 422, 429, 500).
- En CA-2 y CA-3 se comprueba que `send` **no** se ha llamado (`expect(send).not.toHaveBeenCalled()`).

## 3. Orden de ejecución

<!-- Pasos numerados, de la rama al PR. -->

1. Esperar a que #40 esté en `main` y a las respuestas de Q1–Q7 en el #12.
2. Rebasar `feat/B1-messages-client` sobre `main` y hacer `pnpm install`.
3. Verificar en el SDK el nombre del método (`send`), el formato del mensaje SMS y el campo de la respuesta (`messageUUID`) y actualizar la spec si cambia algo.
4. Crear `vonage-errors.ts` con los 3 errores tipados (`VonageAuthError`, `VonageValidationError`, `VonageNetworkError`).
5. Fase roja: escribir los tests CA-1 a CA-8.
6. Fase verde: implementar `VonageMessagesClient` y `createVonageMessagesClient(env)`.
7. Pasar `pnpm check` y `pnpm test`.
8. Prueba manual opcional contra Vonage real.
9. Escribir `04-validation.md` y abrir el PR con `Closes #12`.

## 4. Riesgos y mitigaciones

<!-- Lo que puede salir mal y qué hacemos. -->

| Riesgo                                                                                  | Mitigación                                                                                                                                  |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| El SDK no se llama como pensamos (`send`, `messageUUID`)                                | se verifica en el paso 3 y se ajusta el tipo mínimo `VonageMessagesSdk`                                                                     |
| `@vonage/messages` no está en el package.json del backend (pnpm no deja importar `SMS`) | se envía un objeto plano a `vonage.messages.send({ channel: 'sms', messageType: 'text', to, from, text })`, sin añadir dependencias (Q8 ⏳) |
| Contestan Q1–Q7 con otra opción                                                         | se actualiza la spec y después se adaptan los tests y la implementación                                                                     |
| La cuenta de prueba no permite enviar SMS a números españoles                           | usar un número de prueba permitido o mockear el envío                                                                                       |
| Conflicto en `pnpm-lock.yaml` al rebasar sobre `main`                                   | resolver el conflicto manualmente y ejecutar `pnpm install`                                                                                 |

## 5. Pendiente

<!-- Lo que depende de respuestas del #12 o del #40. -->

- Respuestas Q1–Q7 en el #12.
- ✅ Merge del #40 (A2), 20/11.
- ✅ SDK verificado (v3.31.1): `vonage.messages.send(...)` devuelve `{ messageUUID }`; SMS con `channel: 'sms'`, `messageType: 'text'`.
- Decidir si se activa _Messages_ en la app de Vonage para la prueba manual.

# B1 · Cliente Vonage Messages — Plan de implementación

> Spec: [`02-specification.md`](./02-specification.md) · Issue: #12 · Estado: listo para TDD (Q1–Q8 cerradas, 20/11)

## 1. Ficheros afectados

<!-- Tabla: etiqueta [NEW]/[MODIFY] · fichero · qué y por qué. -->

| Etiqueta   | Fichero                                                | Qué y por qué                                                                                  |
| ---------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `[MODIFY]` | `backend/src/services/messaging.service.ts`            | Añadir `VonageMessagesClient`, el tipo `VonageMessagesSdk` y `createVonageMessagesClient(config)` |
| `[NEW]`    | `backend/src/__tests__/vonage-messages.client.test.ts` | Tests CA-1 a CA-8 con cliente mockeado                                                         |
| `[NEW]`    | `backend/src/lib/vonage-errors.ts`                     | Los 3 errores tipados, para que B2/B3 los importen sin depender del cliente                    |
| `[MODIFY]` | `backend/package.json` + `pnpm-lock.yaml`              | Añadir `@vonage/messages@1.28.1` (Q8), misma versión que trae `@vonage/server-sdk`             |

Sin cambios en `app.ts` (Q6), `openapi.yaml` ni `schema.prisma`. Dependencia nueva: `@vonage/messages` (se declara en el PR).

## 2. Estrategia de pruebas (TDD)

<!-- Fase roja, fase verde y dobles de prueba (cliente mockeado). -->

**Fase roja:** escribir `vonage-messages.client.test.ts` con los criterios CA-1 a CA-8 → fallan porque aún no existe `VonageMessagesClient` ni la función `createVonageMessagesClient`.

**Fase verde:** implementar `VonageMessagesClient`, el tipo `VonageMessagesSdk` y `createVonageMessagesClient(config)` y los errores de `vonage-errors.ts`, hasta que pasen.

**Dobles de prueba:**

- Cliente falso: `{ send: vi.fn().mockResolvedValue({ messageUUID: 'msg-123' }) }`.
- Para los errores: `send: vi.fn().mockRejectedValue(...)` con el código HTTP de cada caso (401, 403, 400, 422, 429, 500).
- En CA-2 y CA-3 se comprueba que `send` **no** se ha llamado (`expect(send).not.toHaveBeenCalled()`).

## 3. Orden de ejecución

<!-- Pasos numerados, de la rama al PR. -->

1. ✅ #40 en `main` y Q1–Q8 decididas (20/11).
2. ✅ `main` mergeado en `feat/B1-messages-client`. Añadir la dependencia: `pnpm --filter backend add @vonage/messages@1.28.1`.
3. ✅ SDK verificado (`send` → `{ messageUUID }`, clase `SMS`, errores `VetchError` con `error.response.status`).
4. ✅ Crear `vonage-errors.ts` con los 3 errores tipados (`VonageAuthError`, `VonageValidationError`, `VonageNetworkError`).
5. ✅ Fase roja (20/11, 20 tests en rojo): escribir los tests CA-1 a CA-8.
6. ✅ Fase verde (20/11, 24 tests en verde): implementar `VonageMessagesClient` y `createVonageMessagesClient(config)`.
7. Pasar `pnpm check` y `pnpm test`.
8. Prueba manual opcional contra Vonage real.
9. Escribir `04-validation.md` y abrir el PR con `Closes #12`.

## 4. Riesgos y mitigaciones

<!-- Lo que puede salir mal y qué hacemos. -->

| Riesgo                                                                                  | Mitigación                                                                                                                                  |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| El SDK no se llama como pensamos (`send`, `messageUUID`)                                | se verifica en el paso 3 y se ajusta el tipo mínimo `VonageMessagesSdk`                                                                     |
| `@vonage/messages` en otra versión que la que usa `@vonage/server-sdk` (tipos duplicados) | fijar la misma versión (1.28.1) y revisar `pnpm-lock.yaml` (Q8 ✅) |
| El SDK no expone el código HTTP en el error como esperamos                              | verlo en la fase roja y ajustar el mapeo de Q4 en la spec                                                                                   |
| La cuenta de prueba no permite enviar SMS a números españoles                           | usar un número de prueba permitido o mockear el envío                                                                                       |
| Conflicto en `pnpm-lock.yaml` al rebasar sobre `main`                                   | resolver el conflicto manualmente y ejecutar `pnpm install`                                                                                 |

## 5. Pendiente

<!-- Lo que depende de respuestas del #12 o del #40. -->

- ✅ Decisiones Q1–Q8 (20/11).
- ✅ Merge del #40 (A2), 20/11.
- ✅ SDK verificado (v3.31.1): `vonage.messages.send(...)` devuelve `{ messageUUID }`; SMS con `channel: 'sms'`, `messageType: 'text'`.
- Activar _Messages_ en la app `homefix-connect-dev` de Vonage (Q1) para la prueba manual.

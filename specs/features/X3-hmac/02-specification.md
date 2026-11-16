# X3 · Middleware verificación de firma de webhooks Vonage

> Issue: [#6](https://github.com/femCodersClub-vonage-program/homefix-connect/issues/6) · Rama: `feat/X3-hmac`

## 1. Resumen y contexto

Vonage avisa al backend mediante webhooks (`session.end` de Video y
`message.status` de Messages). Cualquiera que conozca la URL podría enviar un
aviso falso y, por ejemplo, disparar los SMS post-visita. Este middleware
comprueba que cada webhook viene de Vonage y no se ha alterado **antes** de que
llegue al handler.

**Objetivo observable:** una petición con firma válida llega al handler; una
sin firma, con firma incorrecta o con el cuerpo alterado recibe
`401 { "error": "Invalid signature" }`.

## 2. Alcance

**Dentro:**
- Función pura que verifica el JWT firmado de Vonage y el `payload_hash`.
- Middleware Express reutilizable que aplica esa verificación.
- Captura del cuerpo original (raw body) en `express.json()` para poder calcular el hash.

**Fuera:**
- Crear las rutas `/api/webhooks/video-events` (A4, #10) y `/api/webhooks/message-status` (B4, #15; post-MVP). Ellas montarán este middleware.
- Protección contra reenvíos (*replay*) por `iat`/`jti`. Un `session.end`
  repetido podría reenviar los 2 SMS: la idempotencia se exige en A4/B4 (un
  webhook repetido no vuelve a notificar) y el *replay* queda como mejora futura.
- Un secreto distinto por API (ver §14).

## 3. Caso de uso

`docs/MVP_DEFINITION.md` — al finalizar la videollamada, Vonage Video envía
`session.end` y Vonage Messages envía `message.status`. `docs/ARCHITECTURE.md`
§Seguridad: «Validación de firma **antes** de procesar (tarea X3)».

## 4. Requisitos funcionales

- **RF-01** El middleware lee el token de la cabecera `Authorization: Bearer <JWT>`.
- **RF-02** Verifica que el JWT está firmado con `HS256` usando `VONAGE_SIGNATURE_SECRET`.
- **RF-03** Verifica que el claim `payload_hash` coincide con el SHA-256 (hex) del cuerpo original recibido.
- **RF-04** Si todo es válido, llama a `next()` sin modificar la petición.
- **RF-05** Si algo falla, responde `401 { "error": "Invalid signature" }` y no llama a `next()`.
- **RF-06** Si `VONAGE_SIGNATURE_SECRET` no está configurado, responde `500 { "error": "Webhook signature secret not configured" }` (nunca deja pasar).
- **RF-07** Registra cada rechazo en el logger con el motivo y la ruta, **sin** el token ni el secreto.

## 5. Reglas de negocio

- **RN-01** Solo se acepta el algoritmo `HS256`. Cualquier otro (incluido `none`) se rechaza.
- **RN-02** La comparación de la firma es de tiempo constante (`timingSafeEqual`).
- **RN-03** Un JWT sin `payload_hash` se rechaza: sin él no se puede comprobar que el cuerpo no se alteró.

## 6. Contrato de entrada

| Campo | Dónde | Tipo | Requerido | Validación |
|---|---|---|---|---|
| `Authorization` | header | string | sí | `^Bearer\s+<header>.<payload>.<firma>$` (base64url) |
| JWT header `alg` | JWT | string | sí | `=== "HS256"` |
| JWT claim `payload_hash` | JWT | string | sí | SHA-256 hex del cuerpo original |
| cuerpo | body | bytes | no | se hashea tal cual llega (vacío si no hay) |
| `VONAGE_SIGNATURE_SECRET` | entorno | string | sí en uso | ya declarado opcional en `config/env.ts` |

## 7. Contrato de salida

- Éxito: no responde; pasa el control al siguiente handler (`next()`).

## 8. Manejo de errores

| Situación | Status | Body |
|---|---|---|
| Sin cabecera / no es `Bearer` | 401 | `{ "error": "Invalid signature" }` |
| JWT mal formado (no 3 partes, base64/JSON inválido) | 401 | `{ "error": "Invalid signature" }` |
| `alg` distinto de `HS256` | 401 | `{ "error": "Invalid signature" }` |
| Firma no coincide (otro secreto o token manipulado) | 401 | `{ "error": "Invalid signature" }` |
| Falta `payload_hash` o no coincide con el cuerpo | 401 | `{ "error": "Invalid signature" }` |
| Secreto no configurado | 500 | `{ "error": "Webhook signature secret not configured" }` |

> **Decisión:** `401` no está en la lista de `AGENTS.md` §11 (`400/403/404/409/500`),
> pero lo fija el criterio de aceptación de la issue y es el código estándar para
> «no autenticado». Se anota en la issue.

## 9. Casos límite

- Cuerpo vacío: se hashea la cadena vacía.
- Cuerpo alterado por un solo byte o reformateado (espacios): el hash cambia → 401.
- Firma de distinta longitud: se rechaza sin llamar a `timingSafeEqual` (que lanzaría).
- Esquema `bearer` en minúsculas: se acepta (el esquema HTTP no distingue mayúsculas).

## 10. Criterios de aceptación

- **Given** un webhook firmado con el secreto correcto y `payload_hash` del cuerpo, **When** llega al middleware, **Then** se llama al handler.
- **Given** un webhook sin cabecera `Authorization`, **When** llega, **Then** `401 { "error": "Invalid signature" }`.
- **Given** un webhook firmado con otro secreto, **When** llega, **Then** `401`.
- **Given** un webhook con firma válida pero cuerpo modificado, **When** llega, **Then** `401`.
- **Given** un JWT con `alg: "none"` o mal formado, **When** llega, **Then** `401`.
- **Given** `VONAGE_SIGNATURE_SECRET` vacío, **When** llega cualquier webhook, **Then** `500` y no se llama al handler.

## 11. Diseño técnico

- `backend/src/lib/vonageSignature.ts` — `checkVonageSignature(token, rawBody, secret)`: función pura que devuelve `{ valid: true }` o `{ valid: false, reason }`, solo `node:crypto` y `zod`.
- `backend/src/lib/rawBody.ts` — `captureRawBody` (opción `verify` de `express.json`) + tipo `rawBody` en la petición.
- `backend/src/middleware/verifyVonageSignature.ts` — `verifyVonageSignature(getSecret = () => env.VONAGE_SIGNATURE_SECRET)`: devuelve el middleware; el secreto se lee en cada petición.
- `backend/src/app.ts` — `express.json({ limit, verify: captureRawBody })`.
- Sin cambios en `openapi.yaml` ni `schema.prisma`. Sin dependencias nuevas.

Uso previsto en A4/B4:

```ts
router.post('/webhooks/video-events', verifyVonageSignature(), handler);
```

## 12. Estrategia de pruebas

- Unitario (Vitest) de la función pura: válido, firma incorrecta, otro secreto, `alg` distinto, mal formado, sin `payload_hash`, cuerpo alterado, cuerpo vacío.
- Unitario del middleware (Supertest sobre una mini app con `captureRawBody`): 200, 401 sin cabecera, 401 firma mala, 401 cuerpo alterado, 500 sin secreto.
- Los JWT de prueba se firman en el propio test con un secreto falso. Sin Vonage real.

## 13. Dependencias

- Hard: ninguna. Soft: T1 (#2) para los paths exactos de los webhooks.
- Bloquea a: A4 (#10), B4 (#15).

## 14. Preguntas abiertas y suposiciones

- **Cabecera:** la issue menciona `X-Vonage-Signature`, pero la documentación de Vonage indica que Messages y Video envían un JWT HS256 en `Authorization: Bearer`, con `payload_hash`. Se implementa lo documentado.
  - https://developer.vonage.com/en/getting-started/concepts/webhooks
  - https://developer.vonage.com/en/video/how-tos/verifying-webhooks/index
- **Un secreto o dos:** Messages usa el secreto de la cuenta y Video el del portal de Video; pueden diferir. Se usa uno (`VONAGE_SIGNATURE_SECRET`) y el middleware acepta el secreto como parámetro, así que añadir un segundo en I1 es un cambio de una línea.

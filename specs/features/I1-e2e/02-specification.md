# I1 · E2E en local con ngrok (vídeo real + SMS real) — Especificación

> Issue: #23 · Rama: `test/I1-e2e` · Requisitos: `01-requirements.md` · Estado: borrador (Q1–Q9 acordadas, 24/11)

## 1. Resumen y contexto

La I1 comprueba **de punta a punta y contra Vonage real** que el MVP funciona en local:

1. Dos pestañas (inquilina y técnica) entran a la misma videollamada.
2. Cuelgan.
3. ~1 min después Vonage manda `sessionDestroyed` al backend por ngrok.
4. El backend cierra la visita y envía **2 SMS reales** (gestora e inquilina).

Es una **prueba manual guiada** (Q1): no añade código ni dependencias. El entregable es la guía en `docs/LOCAL_SETUP.md` §14 y las evidencias en `04-validation.md`.

## 2. Alcance

**Entra:**

- Guía paso a paso: requisitos previos, ngrok, panel de Vonage, teléfonos reales en la BD local, ejecución, comprobaciones y reset.
- Una ejecución real con evidencias (logs, estados en BD, SMS recibidos).
- Anotar los hallazgos sobre Vonage (firma de Video, retraso de `sessionDestroyed`).

**No entra:** ver `01-requirements.md` §4.

## 3. Requisitos funcionales

| ID   | Requisito | Fuente |
| ---- | --------- | ------ |
| RF-1 | La guía permite repetir la prueba desde cero a cualquiera del equipo con su `.env` | E-04 · Q5 |
| RF-2 | Un único túnel `ngrok http 3000`; la URL del callback de Video es `https://<ngrok>/api/webhooks/video-events` | D-01 · D-03 |
| RF-3 | Los teléfonos reales se ponen solo en la BD local con Prisma Studio | Q3 · E-07 |
| RF-4 | La prueba se hace con dos pestañas de `http://localhost:5173`, una con rol Inquilina y otra con rol Técnica | E-02 · D-02 · Q6 |
| RF-5 | Se documenta la espera de ~1 min hasta `sessionDestroyed` | D-08 |
| RF-6 | Para repetir: `pnpm db:reset` y volver a poner los teléfonos | D-07 |
| RF-7 | Si la firma de Video no pasa la X3 → hallazgo documentado + issue aparte, sin desactivar la firma | Q4 |

## 4. Criterios de aceptación

- [ ] **CA-1 · Túnel:** Dado `pnpm dev` y `ngrok http 3000`, cuando hago `GET https://<ngrok>/api/health`, entonces responde 200 desde el backend local.
- [ ] **CA-2 · Vídeo:** Dado el seed con `inc_demo`, cuando la pestaña A (Inquilina) y la pestaña B (Técnica) pulsan «Entrar a la videollamada», entonces cada una ve su vídeo local y el remoto de la otra, y `POST /api/video-tokens` devuelve 200 con un `sessionId` real (no `stub-session-…`).
- [ ] **CA-3 · Webhook:** Dado que las dos cuelgan, cuando pasa ~1 min, entonces el backend recibe `POST /api/webhooks/video-events` con `event = sessionDestroyed` y responde **200 `processed`** (no 401).
- [ ] **CA-4 · Estados:** Después de CA-3, `VideoSession` está en `ENDED` con `endedAt` y `Incident` en `VIDEO_COMPLETED`.
- [ ] **CA-5 · SMS:** Después de CA-3, llegan **2 SMS reales** a los móviles de gestora e inquilina con el texto de la plantilla `post_visit`, y hay 2 `Notification` en `QUEUED` con `providerMessageId`.
- [ ] **CA-6 · Sin duplicados:** Si Vonage repite el callback, el backend responde `already_processed` y no se envían más SMS.
- [ ] **CA-7 · Documentado:** `docs/LOCAL_SETUP.md` §14 explica todo lo anterior, incluido el reset y la tabla de errores.
- [ ] **CA-8 · Nada sensible en Git:** `git diff` no contiene teléfonos reales, ids de aplicación, secretos ni URLs de ngrok personales.
- [ ] **CA-9 · Toast (Q8):** solo si el #51 (C5) está en `main`: tras CA-3 la pantalla muestra «Visita finalizada».

## 5. Errores esperables y qué hacer

| Síntoma | Causa probable | Qué hacer |
| ------- | -------------- | --------- |
| No llega ningún `POST /api/webhooks/video-events` | URL del callback mal puesta, ngrok reiniciado (URL nueva) o no se ha esperado ~1 min | Revisar la URL en el panel de Vonage y la consola de ngrok (`http://127.0.0.1:4040`) |
| El webhook responde **500** «Webhook signature secret not configured» | `VONAGE_SIGNATURE_SECRET` vacío en `.env` | Copiar el *signature secret* de la cuenta de Vonage y reiniciar `pnpm dev` |
| El webhook responde **401** | La firma del callback de Video no coincide con lo que verifica la X3, o `VONAGE_SIGNATURE_SECRET` no es el de la cuenta | Comprobar el secreto; si es correcto → hallazgo + issue (Q4) |
| Webhook 200 pero `Notification` en `FAILED` | Remitente (`VONAGE_MESSAGES_FROM`) no válido, sin saldo o número de destino no verificado en cuenta de prueba | Ver `error` de la `Notification` y el log; revisar cuenta |
| `POST /video-tokens` → 409 | La incidencia ya está en `VIDEO_COMPLETED` de una prueba anterior | `pnpm db:reset` y volver a poner los teléfonos |
| `POST /video-tokens` → 500 | Credenciales de Video | `LOCAL_SETUP.md` §13 |

## 6. Datos y contratos

Sin cambios en `openapi.yaml`, `schema.prisma`, código ni dependencias (Q9).

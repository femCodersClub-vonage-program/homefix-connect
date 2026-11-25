# I1 · E2E en local con ngrok — Validación

> Spec: [`02-specification.md`](./02-specification.md) · Issue: #23 · Rama: `test/I1-e2e` · Ejecución: 24/11/2026 ~19:28–19:32 (CET)

## Entorno

- Windows + PowerShell, `pnpm dev` (backend :3000, frontend :5173), Postgres en Docker con el seed.
- ngrok 3.39.13 (plan gratuito): `ngrok http 3000`. **Hace falta ngrok ≥ 3.30.0**: con la 3.3.1 que instala `winget` falla con `ERR_NGROK_121`; se arregla con `ngrok update`.
- Cuenta de Vonage **de prueba (trial)** de Carolina, aplicación `homefix-connect-dev`. Sin números de Vonage (la prueba no deja comprarlos); SMS solo a números de test verificados.
- `VONAGE_MESSAGES_FROM=HomeFix` (remitente alfanumérico).
- Session monitoring callback URL = `https://<ngrok>/api/webhooks/video-events`, con *Signature secret* activado y copiado a `VONAGE_SIGNATURE_SECRET`.
- Teléfonos de gestora e inquilina cambiados **solo en la BD local** (Prisma Studio) al número de test verificado.

## Criterios de aceptación

| CA | Resultado | Evidencia |
| -- | --------- | --------- |
| CA-1 · Túnel | ✅ | `GET https://<ngrok>/api/health` → `200 {"status":"ok"}` |
| CA-2 · Vídeo | ✅ | Pestaña 1 (Inquilina) y pestaña 2 (Técnica) en «Conectado», cada una con vídeo local y remoto |
| CA-3 · Webhook | ✅ | Consola de ngrok: `sessionCreated`, 2× `connectionCreated`, 2× `streamCreated`, 2× `streamDestroyed`, 2× `connectionDestroyed` → `200 {"status":"ignored"}`; `sessionDestroyed` (`reason: clientDisconnected`) → `200 {"status":"processed"}` en 578 ms. **Ningún 401** |
| CA-4 · Estados | ✅ | `VideoSession` `ENDED` con `endedAt`; `GET /api/incidents/inc_demo` → `status: VIDEO_COMPLETED` |
| CA-5 · SMS | ✅ | 2 `Notification` `post_visit` en `QUEUED` con `providerMessageId` y `error = null` (gestora e inquilina) y **2 SMS recibidos** en el móvil de test (confirmado por Carolina) |
| CA-6 · Sin duplicados | ✅ | *Replay* del `sessionDestroyed` desde la consola de ngrok → `200 {"status":"already_processed"}`; siguen 2 `Notification` |
| CA-7 · Documentado | ✅ | `docs/LOCAL_SETUP.md` §14 (14.1–14.8) |
| CA-8 · Nada sensible en Git | ✅ | `git diff` revisado: sin teléfonos reales, secretos, ids de cuenta ni URL de ngrok (se usa `xxxx.ngrok-free.dev`) |
| CA-9 · Toast C5 | — | Fuera: el #51 no estaba en `main` (Q8) |

## Hallazgos

- **La firma de los callbacks de Video coincide con la X3** (JWT HS256 + `payload_hash`): todos los callbacks pasaron `verifyVonageSignature`. Cierra la duda abierta en la A4.
- El *signature secret* de Video se configura **en la propia aplicación** (Edit → Video → Session monitoring → *Signature secret*), no en *API Settings*.
- **`sessionDestroyed` llegó exactamente 60 s** después del último `connectionDestroyed` (18:29:39Z → 18:30:39Z).
- El frontend no tiene botón de colgar: la llamada se termina cerrando las pestañas.
- La `VideoSession` del seed reutiliza la sesión de Vonage creada en pruebas anteriores (`startedAt` del 17/11).
- Con cuenta de prueba los SMS llevan añadido «[FREE SMS DEMO, TEST MESSAGE]».

## Validación del repo

Sin cambios de código: solo `docs/LOCAL_SETUP.md` y `specs/features/I1-e2e/`. `pnpm check` y `pnpm test` no se ven afectados.

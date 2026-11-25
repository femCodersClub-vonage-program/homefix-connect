# I1 · E2E en local con ngrok (vídeo real + SMS real) — Requisitos

> Issue: #23 · Rama: `test/I1-e2e` (sale de `main` = `e820d70`) · Depende de: A5 ✅, B5 ✅, C6 (#22, abierto)

## 1. Requisitos clasificados

### Explícitos (issue #23 + `docs/`)

| ID   | Requisito | Fuente |
| ---- | --------- | ------ |
| E-01 | Validar el flujo completo en local contra Vonage real (Video + Messages) | Issue #23 |
| E-02 | Dos pestañas se conectan a la misma videollamada | Issue #23 · `MVP_DEFINITION.md` escenarios 1 y 2 |
| E-03 | Al colgar llegan **2 SMS reales** (gestora e inquilina) | Issue #23 · `MVP_DEFINITION.md` escenario 3 |
| E-04 | El flujo queda documentado | Issue #23 |
| E-05 | Los webhooks llegan al backend local a través de ngrok | `README.md` · `TASKS.md` (I1) · `SDD_PLAN.md` |
| E-06 | Anotar las decisiones como comentario en el issue y actualizar contrato o schema en el mismo PR (si aplica) | Issue #23 |
| E-07 | Nada de secretos, `private.key` ni teléfonos reales en Git | `AGENTS.md` §2 y §12 · `README.md` |

### Derivados

| ID   | Requisito | Justificación |
| ---- | --------- | ------------- |
| D-01 | Solo hace falta **un túnel**, al backend (`ngrok http 3000`): las dos pestañas abren `http://localhost:5173` y Vite reenvía `/api` al backend | `frontend/vite.config.ts` (proxy a `:3000`) |
| D-02 | Cada pestaña elige su rol con el selector «Inquilina / Técnica» (cabeceras simuladas `X-User-Id` + `X-User-Role`) | `IncidentDetail.tsx` · `api/incidents.ts` |
| D-03 | La URL del callback de Video es `https://<ngrok>/api/webhooks/video-events` y se configura en el panel de Vonage (*Session Monitoring*) | A4 (#48) · `app.ts` |
| D-04 | El callback de Video tiene que pasar la firma de la X3 (`VONAGE_SIGNATURE_SECRET`); si no, el webhook responde 401 y no salen los SMS | A4 `01-requirements.md` §2 (pendiente confirmar con un callback real) |
| D-05 | Los SMS salen a `User.phone` de la gestora y de la inquilina. El seed trae números falsos (`+3460000000X`), así que para la prueba hay que poner números reales **solo en la BD local** | `backend/src/db/seed.ts` · `README.md` (no hay variables `*_PHONE`) |
| D-06 | `VONAGE_MESSAGES_FROM` tiene que tener un remitente válido para la cuenta que se use | B1 `04-validation.md` · `messaging.service.ts` |
| D-07 | Tras una ejecución la incidencia queda en `VIDEO_COMPLETED` y `POST /video-tokens` devuelve 409: para repetir la prueba hay que resetear la BD (`pnpm db:reset`) | A3 (409) · A4 |
| D-08 | `sessionDestroyed` llega ~1 min después de colgar: la espera forma parte del flujo documentado | A4 `01-requirements.md` §2 |
| D-09 | `WEBHOOK_BASE_URL` está en `env.ts` pero el código no la usa; la URL buena es la que se pone en el panel de Vonage | Revisión de `backend/src` |

## 2. Hallazgos al revisar el repo (24/11)

- `AGENTS.md` §10 sitúa el E2E de la I1 en `frontend/tests/e2e/` con **Playwright**, pero Playwright no está instalado (sería una dependencia nueva) y §12 dice que **los E2E los define el equipo, no la IA**.
- Un E2E automatizado contra Vonage real no puede correr en la CI (credenciales, números verificados, ngrok).
- El issue marca **C6 (#22)** como bloqueante y sigue abierto. La C6 son tests del frontend: no cambia el flujo que se prueba aquí.
- El `.env` local ya tiene `VONAGE_MESSAGES_FROM`, `VONAGE_SIGNATURE_SECRET` y credenciales rellenas (no se han leído los valores).
- La C5 (toast «Visita finalizada», PR #51) está aprobada pero sin mergear.

## 3. Preguntas de clarificación (pendientes)

| #   | Pregunta | Opciones | Propuesta |
| --- | -------- | -------- | --------- |
| Q1  | ¿Qué es el «E2E» de la I1? | A) Prueba manual guiada + documentación + evidencias · B) Test Playwright automatizado | **A**. Playwright es dependencia nueva, los E2E los define el equipo (§12) y no puede correr en la CI con Vonage real. Se deja anotado para I2 o post-MVP |
| Q2  | ¿Con qué cuenta de Vonage? | A) La de Carolina (la usada en la A2) · B) La del equipo/programa | Confirmar en el sync. Las dos valen si el `VONAGE_SIGNATURE_SECRET`, la aplicación y el remitente son de la misma cuenta |
| Q3  | ¿Cómo se ponen los teléfonos reales? | A) `UPDATE` en la BD local tras el seed (Prisma Studio o SQL) · B) Variables nuevas en `.env` · C) Cambiar el seed | **A**: nada en Git, sin variables nuevas ni cambios de código |
| Q4  | ¿Y si el callback de Video no pasa la firma de la X3? | A) Documentar el hallazgo y abrir un issue aparte · B) Desactivar la firma para la prueba | **A**. No se desactiva la seguridad; se pregunta en la sesión con Vonage |
| Q5  | ¿Dónde se documenta el flujo? | A) Nueva sección en `docs/LOCAL_SETUP.md` · B) Doc nuevo `docs/E2E_LOCAL.md` | **A** (es donde está todo el arranque local) + evidencias en `specs/features/I1-e2e/04-validation.md` |
| Q6  | ¿Las dos pestañas en el mismo PC o una en el móvil? | A) Mismo PC (lo que pide el criterio) · B) Móvil por ngrok | **A**; el móvil queda como prueba opcional (Miranda ya lo probó en la C4) |
| Q7  | ¿Se espera a la C6 para empezar? | A) Empezar ya · B) Esperar | **A**, confirmándolo en el sync |
| Q8  | ¿Entra el toast de la C5 en la comprobación? | A) Sí, si el #51 está en `main` · B) No | **A** si se mergea antes; si no, fuera |
| Q9  | ¿Cambios de código? | — | **Ninguno previsto.** Si la prueba saca un bug, se arregla en su propio issue/PR |

## 4. Fuera de alcance

- Test E2E automatizado con Playwright (Q1).
- Webhook `message.status` y estado `DELIVERED` (B4, post-MVP).
- Validación de replay y rate limiting de webhooks (I2).
- Postgres en la CI y actualizar AGENTS §10 (acordado en Slack el 24/11, otra tarea).
- Despliegue fuera de local.

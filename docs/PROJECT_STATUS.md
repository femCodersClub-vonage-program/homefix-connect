# Estado real del proyecto — Homefix Connect MVP

> **Snapshot:** 25/11/2026 · `main` @ `fae42c1`
> **MVP Extended:** las mejoras y el bugfixing posterior se planifican en
> [`MVP_EXTENDED.md`](./MVP_EXTENDED.md). B4, la vista de la gestora y el cierre
> explícito de visita pasan a ese alcance; este documento sigue siendo el
> snapshot del MVP base.
> **Sustituye** al estado del 20/11. Este documento se ha reconstruido leyendo el
> código, el contrato, los tests y el tablero, no solo las descripciones de los PR.
> No es una lista de tareas: para eso está [`docs/TASKS.md`](./TASKS.md).
>
> **Actualización 27/11/2026:** C7 (alternar cámara) entra en el MVP base y sale
> del alcance extendido. El cambio de alcance se hace antes del código en un PR
> de docs/spec. La implementación usa `Publisher.cycleVideo()` del SDK 2.36.0 y
> **no recrea el publisher**: hacerlo dispara `streamDestroyed` en la otra
> pestaña y `handleRemoteGone()` (`useVideoCall.ts:219`) cuelga su llamada. El
> botón dice "Alternar cámara" porque el SDK no garantiza saber si la activa es
> frontal o trasera. Issue #46 y spec en `specs/features/C7-camera-switch/`.

---

## 1. Veredicto ejecutivo

- **El camino feliz del MVP funciona en `main`.** Dos pestañas entran a la misma
  sesión, se ven y se oyen, una cuelga y Vonage dispara el webhook; el backend
  cierra la sesión, pasa la incidencia a `VIDEO_COMPLETED` y envía 2 SMS.
  Verificado el 24/11 con vídeo y SMS reales (cuenta trial) en la tarea I1.
- **La entrega está muy avanzada:** 25 PRs mergeados, 195 tests unitarios/contrato
  en verde, 21 tests de integración contra Postgres real y CI con servicio de
  Postgres. Solo queda un PR abierto (#56), aprobado y con CI verde.
- **El MVP no está «cerrado» todavía.** Faltan tres cosas de producto/experiencia:
  el aviso C5 no se ha verificado E2E, tras colgar la misma pestaña no muestra
  «Visita realizada» sin recargar, y los edge cases de I2 (rate limit, desconexión
  remota, reconexión) no están implementados.
- **Hay deuda de contrato y de operación:** el webhook no está en
  `backend/openapi.yaml`, los tests de contrato solo cubren vídeo, el seed no
  restaura el estado de demo y la documentación de arranque está desfasada.
- **Conclusión:** *demo-ready* en un entorno controlado; **no production-ready**.
  Cerrar el MVP con rigor son ~3–4 días de trabajo enfocado más 2–3 decisiones de
  producto que deben tomarse en el sync, no en un PR.

---

## 2. Evidencia de esta revisión

Ejecutado desde la raíz del repositorio el 25/11/2026:

| Comando | Resultado |
|---|---|
| `pnpm check` | ESLint sin errores · `tsc --noEmit` OK en backend y frontend |
| `pnpm test` | **backend 141/141** (12 ficheros) · **frontend 54/54** (6 ficheros) = **195** |
| `pnpm --filter backend test:integration` | **21/21** (5 ficheros) contra `homefix-db` healthy |
| `pnpm build` | OK · frontend `3.428,96 kB` (gzip `1.055,05 kB`) con warning de chunk > 500 kB |
| `pnpm gen:types` | Regenera `frontend/src/api/generated/openapi.d.ts` sin diff (idempotente) |
| `git status` | Limpio salvo este documento sin trackear |

También se revisaron:

- Los **26 PRs de la serie #27–#58**: 25 mergeados y el #37 cerrado sin merge.
- Los **5 issues abiertos** (#15, #22, #24, #46, #55).
- El tablero: 25 tarjetas en Done, #15/#22/#46 en Backlog, #24 en In progress y
  #55 en In review.
- `docs/MVP_DEFINITION.md`, `docs/TASKS.md`, `docs/ARCHITECTURE.md`, los
  `AGENTS.md`, y todas las specs de `specs/features/` salvo las de I2 (solo en
  la rama `origin/feat/I2-edge-cases`).
- El código de `backend/src` (rutas, servicios, repos, seed, schema, OpenAPI) y
  de `frontend/src` (páginas, componentes, hooks y tests).

> Los números de línea citados corresponden a `main` en `fae42c1`.

---

## 3. Inventario de lo entregado

### 3.1 PRs mergeados (25)

| Tarea | PR | Qué dejó en `main` |
|---|---|---|
| T0 · Monorepo | #27 | pnpm workspaces, Node 24, Postgres en Docker |
| Docs fundación | #28, #29 | `AGENTS.md`, arquitectura v0, deltas por capa |
| T1 · Contrato | #31 | `backend/openapi.yaml` con health, incidents y video-tokens |
| X1 · Interfaces | #30 | Interfaces de servicios/repos + stubs en memoria |
| X3 · Firma | #32 | Verificación HMAC del webhook de Vonage |
| C2 · Detalle | #33 | Pantalla `IncidentDetail` con rol, estado y visita |
| Decisiones MVP | #34 | Alineación de alcance y decisiones en docs |
| A1 → A2 | #35 | A1 absorbida por A2 (una sola tarea) |
| A3 · Tokens | #36 | `POST /api/video-tokens` |
| A2 · Servicio vídeo | #40 | `VideoService` real, creación de sesión y persistencia |
| C1 · Cliente API | #39 | Tipos generados desde OpenAPI + `client.ts` |
| Fix #38 | #41 | `GET /incidents/:id` devuelve solo campos del contrato |
| C3 · Llamada local | #42 | SDK JS, publicación local y estados de conexión |
| B1 · Cliente SMS | #43 | `VonageMessagesClient` con errores tipados |
| B2 · Envío SMS | #44 | `sendPostVisit` a gestora e inquilina |
| C4 · Vídeo remoto | #45 | Suscripción al stream remoto y eventos |
| B3 · Notificaciones | #47 | Registros `Notification` + idempotencia |
| A4 · Webhook | #48 | `POST /api/webhooks/video-events`, cierre e idempotencia |
| B5 · Tests mensajería | #49 | Integración de `Notification` y `sendPostVisit` con Postgres |
| A5 · Tests vídeo | #50 | Integración de tokens, sesión y webhook |
| C5 · Toast | #51 | Aviso «Visita finalizada» (unitario, sin demo E2E) |
| I1 · E2E local | #52 | Guía ngrok + evidencia real de vídeo y SMS |
| CI integración | #54 | Postgres 16 en CI + `test:integration` |
| C8 · Colgar | #58 | Botón «Colgar» que desconecta la sesión |

### 3.2 Abierto

| Elemento | Estado | Lectura |
|---|---|---|
| **PR #56** `chore/typecheck-tests` | **OPEN**, aprobado, CI verde, MERGEABLE | 2 ficheros, +9/−1: `pnpm typecheck` pasa a revisar `backend/tests` y los configs de Vitest. Listo para squash. |
| **Issue #55** | In review | Issue del PR #56. Se cierra con él. |
| **Issue #24 · I2** | In progress | Edge cases + demo. Solo hay un commit docs-only en `origin/feat/I2-edge-cases`; código sin empezar. |
| **Issue #22 · C6** | Backlog | «Tests frontend». En la práctica hay 54 tests y 6 ficheros; el issue no lo refleja ni tiene PR. |
| **Issue #46 · C7** | Backlog | Cámara frontal/trasera. **Fuera del MVP**; además su enfoque previsto (recrear el publisher) dispararía `streamDestroyed` en la otra pestaña. |
| **Issue #15 · B4** | Backlog | `POST /webhooks/message-status`. **Pasa al MVP Extended (E2)**; el issue pide estados que no coinciden con los documentados por Vonage. |

---

## 4. Qué hay implementado de verdad

### 4.1 Backend

- **Composición con inyección**: `createApp(deps)` en `backend/src/app.ts:39`
  monta health, incidents, video-tokens y video-events. Los tests inyectan
  dobles sin levantar Postgres.
- **Vídeo**
  - `POST /api/video-tokens` valida cabeceras y body con Zod, comprueba rol,
    estado de incidencia/visita/sesión y crea la sesión de Vonage la primera vez
    (`backend/src/routes/video-tokens.ts`).
  - Webhook `POST /api/webhooks/video-events` con firma HMAC, filtro de
    `sessionDestroyed`, idempotencia y orden «cerrar visita → SMS»
    (`backend/src/routes/video-events.ts:29-108`).
- **Mensajería**
  - `MessagingPostVisitNotifier` envía a gestora e inquilina, continúa si una
    falla y registra `Notification` `QUEUED`/`FAILED` (`messaging.service.ts:85-165`).
  - Plantilla única y `POST_VISIT_TEMPLATE_ID = 'post_visit'`
    (`messaging.service.ts:40,52`).
  - Cliente real de Vonage Messages con validación E.164, máscara de teléfono y
    traducción de errores a `VonageAuthError`/`VonageValidationError`/`VonageNetworkError`.
- **Datos**
  - `schema.prisma`: `Incident`, `Visit`, `VideoSession`, `Notification` y enums.
  - `seed.ts` crea usuarios, incidencia, visita y sesión con IDs fijos.
- **Tests**: 12 ficheros en `pnpm test` (10 unitarios + 2 de contrato, solo vídeo)
  y 5 de integración.

### 4.2 Frontend

- **Detalle de incidencia** (`pages/IncidentDetail.tsx`): carga la incidencia,
  selector de rol, datos de visita, botón de entrada y `VideoCall`.
- **Videollamada** (`components/VideoCall.tsx` + `hooks/useVideoCall.ts`):
  publica cámara/micrófono, se suscribe al remoto, muestra estados, espera al
  par y permite colgar. Limpia publisher y sesión al desmontar.
- **Entrada** (`JoinButton.tsx`): habilita solo si `VISIT_ASSIGNED` +
  visita `CONFIRMED`; con `VIDEO_COMPLETED` muestra «Visita realizada».
- **Aviso de fin** (`useFinishToast.ts` + `FinishToast.tsx`): detecta la
  transición a `VIDEO_COMPLETED`, muestra el toast 5 s.
- **Datos**: React Query; polling cada 5 s hasta `VIDEO_COMPLETED`
  (`useIncident.ts:9-10`). Cliente HTTP tipado y errores `HttpError`.
- **Tests**: 6 ficheros / 54 tests, incluidos 20 de `VideoCall`, 22 de
  `IncidentDetail` y 3 de `App`.

### 4.3 Contrato y datos

- `backend/openapi.yaml` expone **3 paths**: `/api/health`, `/api/incidents/{id}`
  y `/api/video-tokens`. Declara `X-User-Id`/`X-User-Role` en incidents y los
  exige en video-tokens.
- Tipos del frontend generados y commiteados; `pnpm gen:types` no produce diff.
- El webhook **no está en OpenAPI** (decisión A4 Q8) aunque es una ruta pública
  del backend.

---

## 5. Cumplimiento del MVP

### 5.1 Escenarios de `MVP_DEFINITION.md`

| Escenario | Estado | Evidencia / matiz |
|---|---|---|
| **1. La inquilina entra** | ✅ | Token `TENANT`, sesión creada/persistida, `VideoSession → ACTIVE`. Tests de contrato e integración. |
| **2. La técnica entra y hay vídeo bidireccional** | ✅ | Verificado con dos pestañas el 24/11 (I1); suscripción remota en C4. |
| **3. Al colgar se envían 2 SMS** | ⚠️ Funciona, con matices | Verificado con SMS reales a números de prueba. El evento real es `sessionDestroyed`, no `session.end`. Se envía ante **cualquier** cierre de sesión, sin comprobar asistencia. |
| **4. Aviso visual de fin** | ⚠️ Implementado, no verificado E2E | Toast unit-testeado, pero I1 se ejecutó antes de C5/C8. Tras colgar, `VideoCall` sigue montado y no se ve «Visita realizada» sin recargar. |

### 5.2 Checklist de `MVP_DEFINITION.md` §7

| Criterio | Estado |
|---|---|
| La inquilina puede entrar desde el detalle | ✅ |
| La técnica puede entrar en la misma llamada | ✅ |
| Ambas se ven y se oyen | ✅ (I1) |
| Al colgar se envían 2 SMS reales | ✅ (I1, cuenta trial) |
| Los SMS llegan a gestora e inquilina | ✅ con números de prueba verificados |
| Webhooks de entrega actualizan la BD | ⏭️ MVP Extended (B4 → E2) |
| El frontend confirma que la visita terminó | ⚠️ Toast sí; botón no visible sin recargar |
| El README explica configurar/ejecutar/probar | ❌ Desfasado (ver §7) |

### 5.3 «Done» de `AGENTS.md` §13

| Requisito | Estado |
|---|---|
| Caso de uso y criterio marcados en el issue | ⚠️ C6/I2 no reflejan el estado real |
| Decisiones de refinamiento anotadas | ⚠️ Parcial (I2 pendiente) |
| Tests añadidos y en verde | ✅ 195 + 21 |
| `pnpm check` sin errores | ✅ |
| Contrato/schema actualizado | ⚠️ Webhook excluido por decisión A4 Q8; revisar |
| Demo local del slice | ⚠️ I1 sí; C5/C8 no repetida |
| CI verde + 1 approval | ✅ en `main`; #56 listo |

---

## 6. Qué falta y en qué orden

> El alcance ampliado —cierre explícito por la técnica, B4, vista de la gestora y
> toast veraz— se detalla en [`MVP_EXTENDED.md`](./MVP_EXTENDED.md). Aquí queda lo
> mínimo para cerrar el MVP base.

### P0 — antes de declarar el MVP cerrado

1. **Mergear #56** (ya aprobado y verde). Cierra el agujero de typecheck en tests.
2. **Verificar C5 + C8 en navegador real** con webhook real y corregir la
   experiencia post-colgado: al recibir `VIDEO_COMPLETED`, desmontar la llamada
   y mostrar «Visita realizada» sin recargar. Es el gap más visible para demo.
3. **Cerrar I2 con alcance mínimo decidido en el sync.** Como mínimo:
   - rate limit en `POST /api/video-tokens`;
   - que la desconexión remota no cuelgue también a quien sigue conectado;
   - decidir si hay reconexión o se acepta como limitación documentada.
4. **Revisar la decisión A4 Q8 sobre el contrato del webhook.** Se decidió no
   añadirlo a OpenAPI porque el frontend no lo consume, pero `AGENTS.md` §2.8 dice
   que OpenAPI es la frontera. Si se mantiene la exclusión, dejarlo escrito como
   excepción; si se revierte, añadir `/api/webhooks/video-events` con sus
   200/400/401 y un contract test (PR `spec/` aprobado, §2.9).
5. **Confirmar o revisar el envío de SMS ante cualquier cierre.** A4 Q1 decidió
   enviar con cualquier `reason` (timeout, corte, cierre de pestaña). Antes de la
   demo hay que aceptarlo explícitamente o filtrar por `reason`/asistencia para
   no anunciar «visita realizada» cuando no la hubo.

### P1 — deuda que afecta a la demo o a la operación

6. **Toast honesto:** hoy afirma «Notificaciones enviadas» aunque algún SMS quede
   `FAILED`; el webhook responde 200 igualmente.
7. **Idempotencia fuerte:** `Notification` no tiene `@@unique([incidentId, template])`;
   dos webhooks concurrentes pueden duplicar SMS. B3 Q6 lo aceptó como riesgo;
   cerrarlo exige la restricción única.
8. **Gestora en la UI:** el MVP dice que consulta el estado, pero el selector solo
   ofrece `TENANT`/`TECHNICIAN`. O se añade un modo consulta o se justifica que
   la gestora use API/SMS.
9. **Seed reproducible:** todos los `upsert` usan `update: {}`
   (`backend/src/db/seed.ts`), así que `pnpm db:seed` **no** restaura la demo
   tras una llamada (ni resetea la sesión ni limpia `Notification`); hace falta
   `pnpm db:reset`. Documentarlo o hacer el seed restaurativo.
10. **Tests de contrato de incidents/health:** hoy solo vídeo valida esquema
    OpenAPI. `GET /incidents/:id` no tiene contract test.

### P2 — limpieza sin impacto directo en el MVP

11. **Chunk de 3,4 MB:** cargar el SDK de Vonage con `import()` dinámico para
    bajar el bundle inicial.
12. **Variables muertas:** `VONAGE_API_KEY`, `VONAGE_API_SECRET`,
    `MANAGER_PHONE`, `TENANT_PHONE`, `TECHNICIAN_PHONE` y `WEBHOOK_BASE_URL` no
    se usan fuera de `config/env.ts` (los teléfonos salen de la BD).
13. **Estados sin uso:** `NotificationStatus.SUBMITTED/DELIVERED` y
    `VisitStatus.COMPLETED` existen pero no se usan. O se justifican o se limpian
    en un PR `spec/`.
14. **`console.log` en `seed.ts`**, prohibido por `AGENTS.md` §9.1.
15. **Docs de specs:** falta `specs/project-context.md` (referenciado por
    `specs/README.md`) y `specs/features/X3-hmac/01-requirements.md`.

---

## 7. Inconsistencias detectadas (con evidencia)

### Contrato y API

1. **El webhook no está en OpenAPI.** `backend/openapi.yaml:6-115` solo declara
   health, incidents y video-tokens, pero `app.ts:92` monta
   `/api/webhooks/video-events`. Fue una decisión explícita (A4 Q8: «no lo consume
   el frontend»), pero choca con la regla «OpenAPI es la frontera»
   (`AGENTS.md` §2.8) y deja sin base el contract test del webhook.
2. **`GET /incidents/:id` ignora las cabeceras que el contrato declara.**
   `openapi.yaml:31-43` documenta `X-User-Id`/`X-User-Role`; la ruta no las lee
   (`routes/incidents.ts:15-40`). El comentario del contrato admite que «aún no
   las exige», pero entonces el 401 no existe y la autorización es solo nominal.
3. **La ruta de incidents no usa el repo inyectado.** Usa `prisma` directo
   (`routes/incidents.ts:18`), a diferencia de video-tokens/video-events. La
   decisión de #38 (Q1, opción B) proponía repo + selección de campos; se
   implementó solo la selección. No es un bug, pero sí una desviación del patrón
   de DI y de la arquitectura en capas que dice `AGENTS.md` §9.3.
4. **Solo hay contract tests de vídeo.**
   `backend/tests/contract/` contiene `video-tokens` y `video-events`; no hay
   validación de esquema para `/incidents` ni `/health`.
5. **El contrato describe el evento como `session.end`** en
   `MVP_DEFINITION.md:87,132`, `ARCHITECTURE.md:50,80,210` y `TASKS.md:97,208`.
   El código usa `sessionDestroyed` (`video-events.ts:29`). El comportamiento es
   correcto; la documentación, no.

### Flujo de negocio y SMS

6. **Se notifica «visita realizada» sin verificar que la visita ocurrió.** Es la
   decisión A4 Q1 (cualquier `reason`), pero el webhook no mira conexiones ni
   duración: cualquier `sessionDestroyed` cierra y envía
   (`video-events.ts:46-95`).
7. **La idempotencia es «existe una Notification», no una restricción única.**
   `existsForIncident` + `create` (`messaging.service.ts:95-101,131-159`) no es
   atómico; el schema no tiene `@@unique([incidentId, template])`
   (`schema.prisma:119-137`). Dos entregas simultáneas pueden duplicar.
8. **El toast miente si falla un SMS.** `FINISH_TOAST_MESSAGE` afirma
   «Notificaciones enviadas» (`FinishToast.tsx:1-2`) y el frontend no recibe el
   resultado del envío; el webhook responde 200 aunque ambas notificaciones
   queden `FAILED`.
9. **La plantilla usa «» y fuerza Unicode.** `messaging.service.ts:40`; con
   GSM-7 el mensaje cabría en menos segmentos. No hay decisión registrada sobre
   el coste/segmentación.
10. **`Notification.status` se queda en `QUEUED` para siempre.** Es coherente con
    el MVP (entrega post-MVP), pero significa que «enviado» = «aceptado por
    Vonage», no «entregado».

### Frontend y experiencia

11. **Tras colgar, la vista no cambia a «Visita realizada» sin recargar.**
    `IncidentDetail.tsx:141-149` renderiza `VideoCall` mientras exista
    `videoToken.data`; al llegar `VIDEO_COMPLETED` por polling, el componente
    sigue montado y el `JoinButton` no se vuelve a evaluar.
12. **La desconexión remota termina la llamada local.** `useVideoCall.ts` trata
    `streamDestroyed`/`sessionDisconnected` como fin para ambos; no hay
    reconexión ni mensaje específico (I2).
13. **No hay rate limit en la generación de tokens.** Un cliente puede pedir
    tokens repetidamente mientras la visita esté `CONFIRMED` y la incidencia no
    esté cerrada (I2).
14. **La gestora no tiene selector de rol.** `IncidentDetail.tsx:100-125` solo
    ofrece inquilina/técnica, aunque `MVP_DEFINITION.md` §2 le asigna consulta.
15. **El polling no se detiene en `CLOSED`.** `useIncident.ts:9-10` solo corta en
    `VIDEO_COMPLETED`; una incidencia cerrada seguiría consultándose cada 5 s.

### Datos y operación

16. **El seed no restaura el estado de demo.** `seed.ts:22-87` usa `update: {}`;
    tras una llamada, `pnpm db:seed` no devuelve la incidencia a
    `VISIT_ASSIGNED` ni limpia las `Notification`. Hay que usar `pnpm db:reset`.
17. **`Visit.status` se queda en `CONFIRMED`** cuando la incidencia ya está
    `VIDEO_COMPLETED`; `VisitStatus.COMPLETED` no se usa. A4 Q6 lo dejó anotado
    como pendiente, pero el modelo mantiene dos estados para el mismo hecho.
18. **Variables de entorno muertas.** Ver §6 (P2.12).
19. **`console.log` en backend.** `seed.ts` lo usa; `AGENTS.md` §9.1 lo prohíbe.

### Documentación y tablero

20. **`docs/TASKS.md` §0 está congelado el 16/11.** Dice que C2 está pendiente y
    que lo siguiente es A2/B1/C1, todo mergeado hace días.
21. **El tablero no refleja el código.** #22 (C6) está en Backlog con los tests
    ya hechos; #24 (I2) está In progress con solo documentación; #46 (C7) sigue
    abierto pese a estar fuera del MVP.
22. **`README.md` y `docs/LOCAL_SETUP.md` están desfasados.** El README aún
    describe Pact/Playwright, `api/http.ts`, una plantilla de SMS distinta a la
    implementada y los webhooks de estado como parte del MVP; LOCAL_SETUP §12
    dice que no hay vídeo ni SMS y §14.5 que no hay botón de colgar, y propone
    `git checkout chore/foundation`. Nada de eso es cierto en `main`.
23. **`docs/ARCHITECTURE.md`** habla de `session.end`, y su §7 lista como
    pendientes decisiones ya tomadas; la última revisión es del 10/11.
24. **`backend/AGENTS.md`** sigue diciendo que `incidents.ts` es «provisional,
    ver T1» y no incluye video-tokens ni video-events en el mapa de rutas.
25. **`specs/README.md`** referencia `specs/project-context.md`, que no existe;
    X3 no tiene `01-requirements.md`.
26. **`docs/SDD_PLAN.md`** sigue fijando Pact y Playwright como stack de tests,
    pero el repositorio usa Vitest + Supertest y no tiene E2E automatizado.
27. **La rama `origin/feat/I2-edge-cases`** contiene solo documentación y afirma
    que «no hay botón de colgar», falso desde C8 (#58). Si se mergea tal cual,
    introduce una afirmación incorrecta.
28. **`AGENTS.md` raíz también deriva:** §4 no lista `test:integration`, §10
    presenta Playwright como E2E de I1 (fue manual) y §11 omite el `401` que el
    webhook ya devuelve.

---

## 8. Decisiones abiertas

| ID | Decisión | Estado | Impacto |
|---|---|---|---|
| A2 Q5 | Token con `data={role}` y sin `userId` | Implementada; confirmación pendiente | No se puede atribuir la conexión a un usuario concreto, solo al rol |
| — | Plantilla con «» (Unicode) | **Sin decisión** | Coste y segmentación de SMS |
| B3 Q6 | Idempotencia fuerte con unique | Aceptada como riesgo | Duplicados bajo concurrencia |
| A4 Q1 | Enviar SMS con cualquier `sessionDestroyed` | Decidida, a revisar antes de demo | Falsos «visita realizada» |
| A4 Q6 | No marcar `Visit.status = COMPLETED` | Decidida; deuda anotada | Dos estados para el mismo hecho |
| A4 Q8 | Webhook fuera de OpenAPI | Decidida, a revisar | Contrato incompleto |
| I2 Q1–Q10 | Rate limit, reconexión, desconexión remota, demo | **Abiertas** | Alcance de I2 y cierre del MVP |
| C6 | ¿Se cierra #22 como cubierto por los 54 tests? | **Abierta** | Higiene del tablero |
| C7 | ¿Se cierra #46 como fuera de alcance? | **Abierta** | Evita trabajo que rompe el vídeo |
| — | ¿La gestora necesita UI propia? | **Abierta** | Criterio de rol del MVP |

---

## 9. Riesgos

| Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|
| El webhook tarda ~1 min tras colgar y la demo parece «colgada» | Alta | Medio | Guion de demo con espera explicada; no prometer inmediatez |
| La pestaña que cuelga no muestra «Visita realizada» | Alta | Alto | P0.2: desmontar la llamada al recibir `VIDEO_COMPLETED` |
| SMS a números no verificados en cuenta trial | Media | Alto | Verificar los números de demo antes; no usar teléfonos reales |
| Webhook inalcanzable (ngrok caído/URL cambiada) | Media | Alto | Checklist de I1; comprobar túnel y dashboard antes de demo |
| Duplicado de SMS por dos webhooks concurrentes | Baja | Medio | Unique + manejo de conflicto (P1.7) |
| El toast afirma envío aunque falle | Media | Medio | Mensaje neutro o estado real (P1.6) |
| Un nuevo contributor sigue README/TASKS desfasados | Alta | Medio | PR único de docs (§7.20–§7.28) |
| C7 se implementa y rompe la llamada del par | Media | Alto | Cerrar #46 o rediseñar con `publisher.setCamera` sin recrear |

---

## 10. Ruta de cierre recomendada

Orden propuesto, respetando «1 issue = 1 rama = 1 PR»:

1. **Mergear #56** (5 min, ya aprobado).
2. **PR de UX post-colgado** (0,5–1 d): al detectar `VIDEO_COMPLETED`, resetear
   el token o desmontar `VideoCall`, mostrar «Visita realizada» y mantener el
   toast. Incluye test de componente del flujo completo.
3. **PR de verificación C5/C8** (0,5 d): repetir I1 con dos pestañas, webhook
   real y SMS; adjuntar evidencia al issue/PR. No hace falta código nuevo.
4. **Sync de I2 y PR mínimo** (1–1,5 d): decidir Q1–Q10, implementar rate limit,
   corregir la desconexión remota y documentar lo que quede fuera.
5. **PR `spec/` del webhook** (0,5 d): OpenAPI + contract test + decisión sobre
   `reason`/asistencia. Requiere aprobación explícita por tocar contrato.
6. **PR de endurecimiento de notificaciones** (0,5–1 d): unique, tratamiento del
   conflicto y toast honesto. Si el unique toca `schema.prisma`, va en PR
   aprobado aparte.
7. **PR de docs** (0,5 d): README, LOCAL_SETUP, TASKS §0, ARCHITECTURE,
   `backend/AGENTS.md`, SDD_PLAN y specs. Cierra también C6/#22; B4/#15 pasa a
   MVP Extended (E2) y C7/#46 queda fuera de alcance.

**Total estimado:** 3–4 días de desarrollo + 2–3 decisiones de producto.
Al terminar, el checklist de `MVP_DEFINITION.md` §7 y el «Done» de `AGENTS.md`
§13 quedan cumplidos sin asteriscos.

---

## 11. Anexo: tarea → PR → estado

| Tarea | PR | Estado real |
|---|---|---|
| T0 | #27 | Mergeado |
| T1 | #31 | Mergeado |
| X1 | #30 | Mergeado |
| X3 | #32 | Mergeado (sin `01-requirements.md`) |
| A1 | #35 | Absorbida por A2 |
| A2 | #40 | Mergeado |
| A3 | #36 | Mergeado |
| A4 | #48 | Mergeado (webhook fuera de OpenAPI) |
| A5 | #50 | Mergeado |
| B1 | #43 | Mergeado |
| B2 | #44 | Mergeado |
| B3 | #47 | Mergeado (idempotencia débil) |
| B4 | — | MVP Extended (E2); issue #15 abierto |
| B5 | #49 | Mergeado |
| C1 | #39 | Mergeado |
| C2 | #33 | Mergeado |
| C3 | #42 | Mergeado |
| C4 | #45 | Mergeado |
| C5 | #51 | Mergeado (sin E2E) |
| C6 | — | Cubierto por tests; issue #22 abierto |
| C7 | — | Fuera de MVP; issue #46 abierto |
| C8 | #58 | Mergeado |
| I1 | #52 | Mergeado (docs + evidencia) |
| I2 | — | Issue #24 In progress; solo docs en rama |
| #38 | #41 | Mergeado |
| #55 | #56 | PR abierto, aprobado, listo |

---

*Documento generado a partir del código y de la ejecución real de la suite el
25/11/2026. Si cambia `main`, este snapshot deja de ser válido: actualizarlo en
el mismo PR que cambie el estado, no «cuando haya tiempo».*

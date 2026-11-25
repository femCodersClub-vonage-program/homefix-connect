# MVP Extended — alcance, bugfixing y plan de implementación

> **Snapshot:** 25/11/2026 · base `main` @ `fae42c1` · revisión 2
> **Documento de planificación.** No implementa nada por sí solo: fija qué se
> añade al MVP, qué se corrige y en qué orden. Cualquier cambio de contrato o
> schema requiere su PR `spec/` aprobado (`AGENTS.md` §2.9).
>
> Documentos base: [`MVP_DEFINITION.md`](./MVP_DEFINITION.md),
> [`PROJECT_STATUS.md`](./PROJECT_STATUS.md), [`ARCHITECTURE.md`](./ARCHITECTURE.md)
> y [`TASKS.md`](./TASKS.md).

---

## 1. Qué es el MVP Extended

El MVP actual demuestra el camino feliz: dos personas entran, hablan y al cerrar
la sesión se envían 2 SMS. El **MVP Extended** añade el control de la visita por
parte de la técnica, la entrega real de los SMS, una vista separada de gestora y
el bugfixing que hoy impide cerrar el ciclo con rigor.

### 1.1 Delta respecto al MVP

| Tema | MVP actual | MVP Extended |
|---|---|---|
| Fin de la visita | `sessionDestroyed` cierra la visita y envía SMS | La técnica marca **Completada** o **No completada**; `sessionDestroyed` es red de seguridad |
| Estado de la visita | Se queda en `CONFIRMED` | `CONFIRMED` = **Agendada** (inicial) · `COMPLETED` = **Completada** · `CANCELLED` = **No completada** |
| Colgar | Si una persona se va, la otra también se desconecta | Si una persona se va, la otra **sigue en la llamada** hasta que cuelgue |
| SMS | Se quedan en `QUEUED` para siempre | B4 actualiza `SUBMITTED` / `DELIVERED` / `FAILED` |
| Gestora | No tiene vista | Vista aparte, solo lectura + cierre de incidencia cuando el informe está listo |
| Toast | Afirma «Notificaciones enviadas» aunque fallen | Avisa según el estado real |
| Entrega | Solo camino feliz | Fallback, corrección de estado, idempotencia y rate limit |

### 1.2 Principios

- El MVP base no se reescribe: se corrige y se amplía.
- La técnica decide si la visita se realizó. La gestora cierra la incidencia.
- El cierre accidental de una sesión **no debe dejar la visita colgada**.
- Ningún cambio de schema/contrato fuera de un PR `spec/`.
- Sigue sin haber login real, creación de incidencias, agenda ni grabación.

---

## 2. Decisiones de diseño

| # | Decisión | Motivo |
|---|---|---|
| **D1** | La técnica marca la visita como **Completada** o **No completada**. Es el camino principal. | Es quien sabe si ha visto lo que necesitaba. |
| **D2** | Si la sesión se destruye sin que la técnica haya marcado nada, la visita pasa a **Completada** como red de seguridad (si la sesión llegó a `ACTIVE`). | Evita visitas colgadas si se cierra la pestaña por accidente. |
| **D3** | La técnica puede **corregir** el estado después: Completada ↔ No completada, mientras la incidencia no esté `CLOSED`. | Un cierre accidental debe tener vuelta atrás. |
| **D4** | «Agendada» es `Visit.CONFIRMED` (el estado inicial del MVP). No se renombra el enum. | Evita un cambio de schema innecesario; la UI traduce. |
| **D5** | «No completada» es `Visit.CANCELLED`; la UI lo muestra como «No completada». | Reutiliza el estado existente; no se añade otro enum. |
| **D6** | «Colgar» y «Finalizar visita» son acciones distintas. «Colgar» lo tienen ambas; «Finalizar / No completada» solo la técnica. | Colgar no implica que la evaluación haya terminado. |
| **D7** | Si una persona cuelga, la otra **permanece** en la llamada con el vídeo remoto retirado y un aviso («La otra persona se ha desconectado»). Solo se cierra la sesión cuando se va la última. | Comportamiento tipo Meet; evita cortar la llamada a quien sigue. |
| **D13** | Cierre accidental → `Visit.COMPLETED` + SMS, pero **se puede corregir a `CANCELLED`** mientras la incidencia no esté `CLOSED`. | La técnica decide al final; el fallback no bloquea la corrección. |
| **D8** | La gestora tiene una **vista aparte** (`?view=manager`), de solo lectura, y puede **cerrar la incidencia** solo si la visita está Completada. | El «informe listo» se representa con la visita completada; no hay modelo de informe. |
| **D9** | B4 entra en el alcance con los estados reales de Vonage: `submitted`, `delivered`, `rejected`, `undeliverable` (y `read` si algún canal lo envía). | El issue #15 habla de `failed`/`expired`, que no son los estados documentados para SMS. |
| **D10** | La firma de `message-status` reutiliza X3 (JWT HS256 + `payload_hash` + `VONAGE_SIGNATURE_SECRET`). | Vonage firma los webhooks de Messages con el mismo esquema. |
| **D11** | El toast avisa del estado real: «enviadas» solo si no hay `FAILED`; «no completada» cuando la visita se corrige. | Hoy el texto miente si un SMS falla. |
| **D12** | Sin reconexión automática de WebRTC. Si se cae la conexión, se muestra el estado y se vuelve a entrar. | Fuera del alcance del MVP Extended. |

> **Limitación conocida:** si la red de seguridad marca Completada y envía SMS,
> una corrección posterior a No completada **no retira los SMS ya enviados**. La
> gestora los sigue viendo en la vista. Se documenta y se acepta en esta fase.

---

## 3. Flujo extendido

### 3.1 Camino principal

```text
Inquilina entra  →  VideoSession ACTIVE
Técnica entra    →  vídeo bidireccional
Técnica pulsa «Finalizar visita»
  → POST /api/incidents/:id/visit-status { status: "COMPLETED" }
  → Visit COMPLETED + Visit.completedAt + Incident VIDEO_COMPLETED
  → 2 SMS + 2 Notification
  → la técnica se desconecta
  → la inquilina sigue en la llamada hasta que pulsa «Colgar»
  → cuando se va la última, sessionDestroyed cierra VideoSession ENDED
  → la inquilina ve «Visita realizada» + toast con el resumen real
  → la gestora ve la visita completada, los estados de los SMS y puede cerrar
```

### 3.2 Marcar «No completada»

```text
Técnica pulsa «No completada» (con confirmación)
  → POST /api/incidents/:id/visit-status { status: "CANCELLED" }
  → Visit CANCELLED + completedAt = null
  → Incident vuelve a VISIT_ASSIGNED
  → NO se envían SMS
  → la gestora ve «No completada» y no puede cerrar la incidencia
```

Si la visita ya estaba Completada y se corrige a No completada:

- Se permite mientras la incidencia no esté `CLOSED`.
- Los SMS ya enviados no se pueden retirar (limitación D12).
- No se envían SMS nuevos.

### 3.3 Red de seguridad (`sessionDestroyed`)

```text
La técnica cierra la pestaña sin marcar nada
  → si queda alguien en la sesión, la sesión sigue; no se destruye
  → cuando se va la última persona, sessionDestroyed
  → VideoSession ENDED siempre
  → si Visit CONFIRMED y la sesión estuvo ACTIVE:
       Visit COMPLETED + Incident VIDEO_COMPLETED + SMS
  → si Visit CANCELLED o COMPLETED: solo cierra la sesión
  → si la sesión nunca estuvo ACTIVE: solo cierra la sesión
  → reason = serverRotation: no se toca la visita
```

### 3.4 Colgar: comportamiento detallado

| Situación | Qué pasa |
|---|---|
| La inquilina pulsa «Colgar» | Se desconecta. La técnica sigue en la llamada, ve «La otra persona se ha desconectado» y puede seguir o colgar. |
| La técnica pulsa «Colgar» sin finalizar | Se desconecta. La inquilina sigue. La visita sigue `CONFIRMED` hasta que se vaya la última o la técnica vuelva a entrar y la marque. |
| Una persona pierde la conexión | Esa persona ve «Desconectada»; la otra sigue conectada y ve el aviso. No se limpia la sesión de la que sigue. |
| Vuelve la persona que se fue | Puede volver a entrar (nuevo token) mientras la sesión siga `ACTIVE`; el que se quedó vuelve a suscribirse al nuevo stream. |
| Se va la última persona | `sessionDestroyed` cierra la sesión. Si la visita seguía `CONFIRMED`, se aplica la red de seguridad. |
| La técnica pulsa «Finalizar visita» | La visita se completa y se envían los SMS; después puede colgar. La inquilina sigue hasta que cuelgue. |

> El botón «Colgar» **no** marca la visita como realizada. Eso solo lo hace
> «Finalizar visita» o la red de seguridad.

### 3.5 Máquina de estados

| Modelo | Estados | Quién lo cambia |
|---|---|---|
| `Incident` | `REPORTED → VISIT_ASSIGNED → VIDEO_COMPLETED → CLOSED` | Técnica (`visit-status`), fallback A4 y gestora (`close`) |
| `Visit` | `PENDING → CONFIRMED (Agendada) → COMPLETED (Completada)` / `CANCELLED (No completada)` | Técnica; fallback A4 |
| `VideoSession` | `PENDING → ACTIVE → ENDED` | A2 (ACTIVE) y A4 (ENDED) |
| `Notification` | `QUEUED → SUBMITTED → DELIVERED` / `FAILED` | B3 (envío) y B4 (entrega) |

Transiciones permitidas de `Visit` mientras `Incident != CLOSED`:

```text
CONFIRMED ──(técnica/fallback)──> COMPLETED
CONFIRMED ──(técnica)───────────> CANCELLED
COMPLETED ──(técnica corrige)───> CANCELLED
CANCELLED ──(técnica corrige)───> COMPLETED
```

Al pasar a `CLOSED` ya no se admite ninguna transición de visita.

---

## 4. Respuesta a las dudas planteadas

### 4.1 ¿Los estados no cambian porque falta el webhook de mensajes?

**No.** El webhook de mensajes (`message.status`) solo actualiza
`Notification.status`. No toca `Incident` ni `Visit`. El que cambia la
incidencia es `sessionDestroyed` (vídeo) o la acción de la técnica. Si la
incidencia no cambia, hay que mirar:

1. Que el callback de Session Monitoring apunte a la URL correcta (ngrok).
2. Que `VONAGE_SIGNATURE_SECRET` sea el de la aplicación de vídeo.
3. Que el evento sea `sessionDestroyed` y traiga `sessionId`.
4. Que la sesión no estuviera ya `ENDED`.
5. Que hayan pasado los ~60 s desde que se fue la última persona.
6. Que la UI refresque: hoy `VideoCall` sigue montado y el botón no cambia sin
   recargar (E0-01).

### 4.2 ¿Quién pone «Visita finalizada»?

La técnica. Es D1. Tiene dos acciones:

- **Finalizar visita** → Completada + SMS.
- **No completada** → No completada, sin SMS.

Si cierra la pestaña por accidente, la red de seguridad la marca Completada
(D2) y la técnica puede corregirla después (D3).

### 4.3 ¿Qué pasa con `sessionDestroyed` «cuando funciona bien»?

Hoy funciona, pero tiene tres aristas que el extendido corrige:

1. **Cierra la visita por cualquier motivo**, incluido un corte. Con la acción
   de la técnica, deja de ser el camino principal y pasa a red de seguridad.
2. **Si la incidencia ya está `VIDEO_COMPLETED`, hace `already_processed` y no
   cierra `VideoSession`.** Con el cierre explícito dejaría la sesión `ACTIVE`
   para siempre. Hay que separar «cerrar sesión» de «cerrar visita».
3. **Una sesión desconocida devuelve 400**, lo que hace que Vonage reintente.
   Debe devolver `200 ignored` y registrar un warn.

### 4.4 ¿Y el webhook de entrega (B4)?

Solo mueve `Notification`:

```text
submitted     → SUBMITTED
delivered     → DELIVERED (+ deliveredAt)
rejected      → FAILED   (+ error)
undeliverable → FAILED   (+ error)
read          → DELIVERED (si el canal lo envía; SMS no)
```

- Nunca se retrocede: `DELIVERED` no vuelve a `SUBMITTED`.
- `FAILED` es terminal salvo que llegue un `delivered` posterior.
- `message_uuid` desconocido → `200 ignored`.
- Mismo UUID + mismo estado → `200 already_processed`.
- Firma inválida → `401`; error de BD → `500` para que Vonage reintente.

### 4.5 Qué cambia en el MVP Extended con las decisiones confirmadas

| Antes en el plan | Ahora (confirmado) |
|---|---|
| La técnica solo «Finalizaba» | También puede marcar **No completada** y **corregir** después |
| La red de seguridad no estaba decidida | **Completa** la visita si la sesión estuvo `ACTIVE`; **se puede corregir** a No completada |
| La gestora era solo lectura | **Solo lectura + cerrar incidencia** cuando la visita está completada (informe listo) |
| El cierre era una vista con rol | **Vista aparte** (`?view=manager`) sin botón de llamada |
| El toast solo miraba `VIDEO_COMPLETED` | Mira estado de la visita + resumen real de notificaciones; avisa si falló algo |
| Colgar desconectaba a ambos | **El que sigue permanece** en la llamada (tipo Meet) hasta que cuelgue |
| No había corrección de estado | Endpoint `visit-status` + UI de corrección Completada ↔ No completada |

---

## 5. Alcance

### 5.1 Dentro

- Cierre y corrección de la visita por la técnica.
- Fallback de `sessionDestroyed` y cierre correcto de `VideoSession`.
- Colgar sin arrastrar a la otra persona.
- B4: webhook de estado de Messages.
- Vista separada de gestora con cierre de incidencia.
- Toast basado en el estado real.
- Rate limit de tokens y desconexión remota controlada.
- Tests, contrato, schema, seed y documentación.

### 5.2 Fuera

- Login real, JWT, RBAC completo.
- Crear incidencias, proponer/confirmar visitas.
- Modelo de informe como documento (se usa «visita completada» como señal).
- Reintentos automáticos o manuales de SMS.
- Reconexión automática de WebRTC.
- Grabación, RCS/WhatsApp/Voice.
- C7 (cámara frontal/trasera).
- Migraciones formales: se usa `prisma db push`.

---

## 6. Backlog propuesto

Cada fila es **1 issue = 1 rama = 1 PR**. Estimaciones de trabajo enfocado.

### E0 · Bugfixing y deuda del MVP

| ID | Título | Rama | Depende | Est. | Criterio de aceptación resumido |
|---|---|---|---|---|---|
| **E0-01** | UX post-colgado: desmontar la llamada y mostrar «Visita realizada» sin recargar | `fix/E0-01-post-hangup-ux` | — | 0,5 d | Al completarse la visita, `VideoCall` se desmonta o se resetea; el botón cambia; test de componente. |
| **E0-02** | Endurecer `sessionDestroyed`: cerrar sesión aunque la visita ya esté completada, ignorar `serverRotation`, sesión desconocida → 200 | `fix/E0-02-session-destroyed` | — | 0,5 d | Webhook idempotente; cierra `VideoSession` siempre que exista y no esté `ENDED`; no reenvía SMS; tests. |
| **E0-03** | Colgar sin desconectar a la otra persona | `fix/E0-03-remote-hangup` | — | 0,5 d | Si el remoto cuelga o pierde conexión, el local sigue `connected`, ve el aviso y puede colgar; si vuelve, se vuelve a suscribir; tests. |
| **E0-04** | Rate limit en `POST /video-tokens` | `fix/E0-04-rate-limit` | — | 0,5 d | Límite por usuario/ventana; 429; tests; contrato con 429. |
| **E0-05** | Contrato y DI de `GET /incidents/:id` + contract tests de incidents/health | `fix/E0-05-incidents-contract` | — | 1 d | Ruta usa repo inyectado; exige cabeceras (401) y valida pertenencia (403); contrato 401/403; tests. |
| **E0-06** | Limpieza: env muertas, `console.log`, seed y bundle | `chore/E0-06-limpieza` | — | 0,5 d | Env sin uso eliminadas/documentadas; seed usa logger; `db:reset` documentado; SDK en `import()` dinámico. |
| **E0-07** | Documentación alineada con `main` y el extendido | `docs/E0-07-readme-y-pendientes` | E0-01…E0-06 + E1–E4 | 1 d | README/LOCAL_SETUP/TASKS/ARCHITECTURE/AGENTS/SDD_PLAN/specs actualizados. |

> **#56** se mergea antes de empezar E0 (ya está aprobado y verde).

### E1 · Ciclo de vida de la visita

| ID | Título | Rama | Depende | Est. | Criterio de aceptación resumido |
|---|---|---|---|---|---|
| **E1-01** | PR `spec/`: contrato y schema del ciclo de visita | `spec/E1-01-visit-lifecycle` | — | 0,5 d | OpenAPI con `visit-status`, `close` y `notifications`; schema con `Visit.completedAt`, `Notification.deliveredAt` y constraints; aprobado. |
| **E1-02** | Backend: cambiar estado de visita | `feat/E1-02-visit-status` | E1-01, E4-02 | 1 d | Técnica asignada; `COMPLETED` → estados + SMS una vez; `CANCELLED` → sin SMS y vuelta a `VISIT_ASSIGNED`; 400/403/404/409; tests. |
| **E1-03** | Frontend: controles de la técnica y etiquetas | `feat/E1-03-visit-controls` | E0-01, E0-03, E1-02 | 1 d | «Agendada/Completada/No completada»; botones Finalizar/No completada con confirmación; corrección; tests. |
| **E1-04** | A4: cerrar sesión y fallback de visita | `fix/E1-04-webhook-fallback` | E1-02 | 0,5 d | `sessionDestroyed` cierra sesión siempre; si la visita sigue `CONFIRMED` y hubo `ACTIVE`, completa y notifica; no duplica; tests. |

### E2 · Entrega de SMS (B4)

| ID | Título | Rama | Depende | Est. | Criterio de aceptación resumido |
|---|---|---|---|---|---|
| **E2-01** | Backend: `POST /api/webhooks/message-status` | `feat/E2-01-message-status` | E1-01 | 1 d | Firma X3; Zod; busca por `providerMessageId`; mapea estados reales; out-of-order e idempotente; 200/400/401/500; tests. |
| **E2-02** | Repo/servicio de estados de notificación | `feat/E2-02-notification-status` | E2-01 | 0,5 d | `findByProviderMessageId` + `updateStatus`; unit tests; sin tocar B3. |

### E3 · Vista de la gestora y cierre

| ID | Título | Rama | Depende | Est. | Criterio de aceptación resumido |
|---|---|---|---|---|---|
| **E3-01** | Backend: `GET /api/incidents/{id}/notifications` | `feat/E3-01-notifications-endpoint` | E1-01, E2 | 0,5 d | Solo participantes/gestora; destinataria, rol, estado, timestamps; sin teléfonos; tests. |
| **E3-02** | Backend: `POST /api/incidents/{id}/close` | `feat/E3-02-close-incident` | E1-02, E0-05 | 0,5 d | Solo gestora asignada; solo si visita `COMPLETED` e incidencia `VIDEO_COMPLETED`; 403/404/409; tests. |
| **E3-03** | Frontend: vista separada de gestora | `feat/E3-03-manager-view` | E3-01, E3-02 | 1 d | `?view=manager`; sin vídeo; estado, visita, notificaciones y botón «Cerrar incidencia»; tests. |

### E4 · Toast y consistencia

| ID | Título | Rama | Depende | Est. | Criterio de aceptación resumido |
|---|---|---|---|---|---|
| **E4-01** | Toast según visita y notificaciones | `fix/E4-01-toast-veraz` | E2, E3-01 | 1 d | Completada con resumen; No completada con aviso; cierre con aviso; fallback neutro; tests. |
| **E4-02** | Idempotencia por destinataria | `fix/E4-02-notification-unique` | E1-01 | 0,5 d | Usa la unique de E1-01; deja de bloquear a todas si una ya tiene registro; P2002 = `ALREADY_SENT`; tests. |

**Total:** 19 issues · **~11,5 días** de desarrollo + revisión + demo. En
calendario, 2,5–3 semanas a tiempo parcial.

---

## 7. Contratos y datos

### 7.1 Endpoints nuevos

#### `POST /api/incidents/{id}/visit-status`

Cabeceras: `X-User-Id`, `X-User-Role: TECHNICIAN`.
Body: `{ "status": "COMPLETED" | "CANCELLED" }`.

| Caso | Código | Cuerpo |
|---|---|---|
| Técnica correcta, cambio aplicado | 200 | `{ status: "completed" / "not_completed", notifications?: {...} }` |
| Mismo estado | 200 | `{ status: "unchanged" }` |
| Incidencia `CLOSED` | 409 | `{ error: "Incident is closed" }` |
| Sin sesión de vídeo | 409 | `{ error: "No video session" }` |
| Rol distinto u otra técnica | 403 | `{ error: "..." }` |
| Incidencia no existe | 404 | `{ error: "Incident not found" }` |

Reglas:

- `COMPLETED`: `Visit.status = COMPLETED`, `completedAt = now`,
  `Incident = VIDEO_COMPLETED`, SMS si no se enviaron ya.
- `CANCELLED`: `Visit.status = CANCELLED`, `completedAt = null`,
  `Incident = VISIT_ASSIGNED`, sin SMS.
- La corrección `COMPLETED ↔ CANCELLED` está permitida mientras no esté
  `CLOSED`.
- Si el SMS falla, la visita queda en el estado elegido y se devuelve el resumen
  con `failed`.
- No se permite a `MANAGER` ni a `TENANT`.

#### `POST /api/incidents/{id}/close`

Cabeceras: `X-User-Id`, `X-User-Role: MANAGER`.
Body: vacío.

| Caso | Código | Cuerpo |
|---|---|---|
| Gestora asignada, visita `COMPLETED` | 200 | `{ status: "closed" }` |
| Ya cerrada | 200 | `{ status: "already_closed" }` |
| Visita no completada / incidencia no `VIDEO_COMPLETED` | 409 | `{ error: "Report not ready" }` |
| Otra gestora o rol distinto | 403 | `{ error: "..." }` |
| Incidencia no existe | 404 | `{ error: "Incident not found" }` |

> «Informe listo» = `Visit.status === COMPLETED`. No hay modelo de informe; si
> más adelante se necesita un informe como documento, se añadirá su propia
> tarea y su propio estado.

#### `GET /api/incidents/{id}/notifications`

Cabeceras: `X-User-Id`, `X-User-Role` (`MANAGER`, `TENANT` o `TECHNICIAN`).

```json
{
  "notifications": [
    {
      "id": "ntf_...",
      "recipient": { "id": "usr_...", "name": "Gestora Demo", "role": "MANAGER" },
      "channel": "SMS",
      "status": "DELIVERED",
      "template": "post_visit",
      "sentAt": "2026-11-25T20:00:00.000Z",
      "deliveredAt": "2026-11-25T20:00:05.000Z",
      "error": null
    }
  ]
}
```

- Sin teléfonos ni emails.
- 403 si el usuario no participa en la incidencia.
- 404 si la incidencia no existe.

#### `POST /api/webhooks/message-status`

La manda Vonage. Firma X3. Body mínimo:

```json
{
  "message_uuid": "...",
  "status": "submitted",
  "timestamp": "2026-11-25T20:00:00Z",
  "error": { "title": "...", "detail": "..." }
}
```

| Caso | Código | Cuerpo |
|---|---|---|
| Estado aplicado | 200 | `{ status: "processed" }` |
| Mismo estado repetido | 200 | `{ status: "already_processed" }` |
| UUID desconocido | 200 | `{ status: "ignored" }` |
| Payload inválido | 400 | `{ error: "Invalid payload" }` |
| Firma inválida | 401 | `{ error: "Invalid signature" }` |
| Error de BD | 500 | `{ error: "..." }` |

### 7.2 Cambios en `openapi.yaml`

- Añadir `visit-status`, `close`, `notifications` y
  `/api/webhooks/message-status`.
- Añadir también `/api/webhooks/video-events` (revisar A4 Q8: ya no se sostiene
  dejarlo fuera si el contrato cubre todos los webhooks).
- Añadir `Visit.completedAt`, `Notification` y `NotificationStatus`.
- Añadir `401` y `429` a las respuestas y a `AGENTS.md` §11.
- Regenerar `frontend/src/api/generated/openapi.d.ts` en el mismo PR `spec/`.

### 7.3 Cambios en `schema.prisma`

| Cambio | Para qué | Nota |
|---|---|---|
| `Visit.completedAt DateTime?` | Saber cuándo se completó y mostrarlo a la gestora | Null cuando está No completada |
| `Notification.deliveredAt DateTime?` | Separar «enviado a Vonage» de «entregado» | `sentAt` sigue siendo la hora de envío |
| `@@unique([incidentId, template, recipientId])` | Evitar duplicados y permitir idempotencia por destinataria | Tratar P2002 como `ALREADY_SENT` |
| `@@unique([providerMessageId])` | Un `message_uuid` = una notificación | Nullable; Postgres permite varios null |

> Todo esto va en **un PR `spec/` aprobado**. No se toca `schema.prisma` dentro
> de un PR de feature.

---

## 8. Estrategia de pruebas

| Nivel | Qué se añade |
|---|---|
| **Unit** | Cambio de estado de visita, corrección, cierre, mapeo B4, out-of-order, rate limit, colgar remoto. |
| **Contrato** | `visit-status`, `close`, `notifications`, `message-status`, `incidents/:id` y `health`. |
| **Integración** | Estados con Postgres, B4, unique/P2002, webhook con visita ya completada, cierre de gestora. |
| **Frontend** | Botones Finalizar/No completada, corrección, colgar remoto, vista gestora, cierre, toast. |
| **Manual E2E** | Dos pestañas + ngrok: finalizar, colgar una, seguir la otra, corregir estado, ver SMS y callbacks, cerrar como gestora. |

Reglas:

- Unitarios sin Postgres; repos mockeados.
- Contract tests definidos por el equipo (`AGENTS.md` §10).
- Un bug arreglado = un test que lo reproduce.
- Sin Playwright/Pact: el E2E sigue siendo manual/documentado.

---

## 9. Orden de ejecución

```text
Bloque 1 — base y colgar
  0. Merge #56
  1. E0-01  UX post-colgado
  2. E0-02  sessionDestroyed
  3. E0-03  colgar remoto
  4. E0-04  rate limit
  5. E0-05  contrato incidents/health

Bloque 2 — ciclo de visita
  6. E1-01  spec (contrato + schema)  ← aprobación
  7. E4-02  idempotencia por destinataria
  8. E1-02  visit-status backend
  9. E1-03  controles de la técnica
  10. E1-04 fallback webhook

Bloque 3 — entrega y gestora
  11. E2-01/E2-02  B4
  12. E3-01         notifications endpoint
  13. E3-02         close endpoint
  14. E3-03         vista gestora
  15. E4-01         toast veraz

Bloque 4 — cierre
  16. E0-06  limpieza
  17. E0-07  docs
  18. Demo E2E + cierre de issues
```

Dependencias críticas:

- **E1-01 bloquea** E1-02, E2, E3 y E4-02.
- **E4-02 bloquea E1-02**: la unicidad debe existir antes de que el cambio de
  estado pueda ejecutarse dos veces.
- **E1-02 bloquea** E1-03, E1-04 y E3-02.
- **E2 bloquea** E3-01 y E4-01.
- **E0-05 bloquea E3-02/E3-03** (cabeceras y 403 de la gestora).
- **E0-01/E0-02/E0-03** pueden ir en paralelo.

---

## 10. Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Cierre accidental → Completada + SMS, y luego se corrige a No completada | SMS ya enviados (confirmado) | Se acepta y se documenta; la gestora ve el histórico con estados reales (B4). La corrección actualiza la visita, no retira SMS. |
| La técnica no marca nada y la sesión nunca se destruye (alguien sigue dentro) | Visita sin cerrar | La UI muestra el estado; la técnica puede finalizar; el fallback solo actúa al irse la última persona. |
| «Informe listo» = visita completada | Puede no reflejar un informe real | Documentado; si se necesita informe, se añade tarea y campo propios. |
| Colgar remoto deja la sesión abierta | Coste de minutos | Es el comportamiento pedido; la sesión se cierra cuando se va la última persona. |
| B4 llega antes de crear la `Notification` | Estado perdido | 200 ignored; se acepta en MVP. |
| Firma de Messages distinta a la de Video | Alto | X3 ya usa JWT HS256 + `payload_hash`; probar callback real antes de cerrar E2. |
| Unique falla con datos duplicados locales | Bajo | `pnpm db:reset` antes de `db:push`; documentar. |
| La gestora cierra sin informe real | Bajo | Se exige `Visit.COMPLETED`; no hay modelo de informe todavía. |

---

## 11. Decisiones pendientes de confirmar

> Las marcadas con ✅ están **confirmadas** por el usuario.

1. ✅ **«No completada» se guarda como `CANCELLED`** — la UI lo llama «No completada»; no se toca el enum.
2. ✅ **Red de seguridad envía SMS** y marca Completada; **se puede corregir** a No completada después (mientras no esté `CLOSED`).
3. ✅ **«Informe listo» = visita Completada** — en este MVP no hay informe como documento; la gestora cierra solo si la visita está Completada.
4. **¿El toast de «No completada» debe verlo también la inquilina?**
   - A (recomendada): sí, para que no se quede con la duda.
   - B: solo técnica y gestora.

---

## 12. Encaje con el tablero actual

| Ahora | Qué hacer |
|---|---|
| **#56** abierto | Mergear; cierra #55 |
| **#55** typecheck tests | Cerrar con #56 |
| **#22** C6 tests frontend | Cerrar como cubierto por los 54 tests, o convertirlo en E0-05 |
| **#24** I2 edge cases | Absorber en E0-03 (colgar) y E0-04 (rate limit); no mantener la rama docs-only |
| **#15** B4 | Pasa a E2-01/E2-02; actualizar estados reales |
| **#46** C7 cámara | Cerrar como fuera de alcance |
| **#38** contrato incidents | Se completa con E0-05 |
| **#21** C5 toast | Se completa con E4-01 |

---

## 13. Definición de «MVP Extended Done»

- [ ] La técnica puede marcar Completada o No completada, y corregir después.
- [ ] «Agendada» es el estado inicial visible.
- [ ] Si una persona cuelga, la otra sigue en la llamada hasta que cuelgue.
- [ ] Si la técnica cierra por accidente, la visita no queda colgada.
- [ ] `VideoSession` siempre acaba en `ENDED` cuando Vonage avisa.
- [ ] `Notification` refleja `submitted`/`delivered`/`failed` reales.
- [ ] La gestora ve la vista aparte y puede cerrar solo con la visita completada.
- [ ] El toast no afirma nada falso y avisa de «No completada».
- [ ] `pnpm check`, `pnpm test`, `pnpm build` y la integración en verde.
- [ ] Demo E2E repetida con dos pestañas, ngrok y callbacks reales.
- [ ] CI verde + 1 approval por PR.

---

*Este documento es el contrato de alcance del MVP Extended. Cualquier cosa que
no esté aquí no se implementa sin actualizarlo y aprobarlo primero.*

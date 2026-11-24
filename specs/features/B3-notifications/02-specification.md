# B3 · Registros `Notification` + idempotencia del aviso post-visita — Especificación

> Issue: #14 (confirmar) · Rama: `feat/B3-notifications` · Requisitos: `01-requirements.md` · Estado: borrador (decisiones Q1–Q6 cerradas, 21/11)

## 1. Resumen y contexto

La B2 envía el SMS post-visita a la gestora y a la inquilina y devuelve `{ sent, failed, skipped }`. La B3 hace dos cosas más dentro de `sendPostVisit`:

1. **Guarda una `Notification` por cada SMS** (enviado → `QUEUED`, fallido → `FAILED`).
2. **Evita reenvíos:** si ya hay `Notification` `post_visit` para esa incidencia, no envía nada.

La A4 (#10) llamará a `sendPostVisit` al recibir `session.end`; con la B3 puede llamarla aunque el webhook llegue repetido.

## 2. Alcance

**Entra:**

- Interface `NotificationRepo` + `InMemoryNotificationRepo` (`src/repositories/notification.repo.ts`).
- `PrismaNotificationRepo` (`src/repositories/prisma-notification.repo.ts`).
- `MessagingPostVisitNotifier` recibe `notificationRepo`, comprueba si ya se envió y guarda los registros.
- `PostVisitResult.skipped` admite el motivo `ALREADY_SENT`.
- Tests unitarios con repos en memoria (sin red ni Postgres).

**No entra:**

- Reintentos automáticos (ADR-012, Q1).
- Paso a `SUBMITTED` / `DELIVERED` y webhook `message.status` (B4, post-MVP).
- Llamar a `sendPostVisit` desde `session.end` y conectar nada en `app.ts` (A4).
- Restricción única contra dos `session.end` simultáneos (Q6).
- Contract tests (B5).

## 3. Requisitos funcionales

| ID    | Requisito | Fuente |
| ----- | --------- | ------ |
| RF-1  | Por cada SMS enviado se crea una `Notification` con `status = QUEUED`, `providerMessageId` y `sentAt` | E-02 · E-03 · D-03 · Q2 |
| RF-2  | Por cada SMS fallido se crea una `Notification` con `status = FAILED` y `error` (nombre del error) | E-04 · D-04 · Q1 |
| RF-3  | Todas las `Notification` llevan `template = "post_visit"`, `channel = SMS` (valor por defecto), `incidentId` y `recipientId` | E-06 |
| RF-4  | Sin gestora → no se crea `Notification` para ella | D-05 |
| RF-5  | Si ya existe alguna `Notification` `post_visit` de la incidencia → no se llama a `sendSms`, no se crea nada y se devuelve `skipped` con `ALREADY_SENT` | E-05 · D-06 · Q3 · Q4 |
| RF-6  | La comprobación de RF-5 se hace dentro de `sendPostVisit` | Q5 |
| RF-7  | No hay reintentos: un fallo queda en `FAILED` y no se vuelve a enviar | Q1 · Q4 |
| RF-8  | Logs y `Notification.error` sin texto del SMS ni teléfonos | D-04 · `docs/ARCHITECTURE.md` §5 |
| RF-9  | Sin cambios en `openapi.yaml`, `schema.prisma` ni `app.ts` | D-07 |

## 4. Reglas de negocio

- **Clave de idempotencia:** `incidentId` + `template = "post_visit"`. Basta con que exista **un** registro (en cualquier estado) para no enviar (Q3, Q4).
- **Orden dentro de `sendPostVisit`:**
  1. `incidentRepo.findById` → si no existe, error (igual que en la B2).
  2. `notificationRepo.existsForIncident(incidentId, 'post_visit')` → si `true`, devuelve `ALREADY_SENT` sin enviar.
  3. Nombre de la técnica, plantilla y envío (igual que en la B2).
  4. Después de **cada** SMS, se guarda su `Notification` antes de pasar a la siguiente destinataria.
- **Estado tras un envío correcto:** `QUEUED` (no `SUBMITTED`), según `docs/TASKS.md` §11 (Q2).
- **`sentAt`:** la hora en que `sendSms` devolvió el `providerMessageId`. En `FAILED` queda `null`.

## 5. Contrato

```ts
// src/repositories/notification.repo.ts
import type { Notification, NotificationStatus } from '@prisma/client';

export type NotificationCreate = {
  incidentId: string;
  recipientId: string;
  template: string;
  status: NotificationStatus;          // en la B3 solo QUEUED o FAILED
  providerMessageId?: string | null;
  error?: string | null;
  sentAt?: Date | null;
};

export interface NotificationRepo {
  existsForIncident(incidentId: string, template: string): Promise<boolean>;
  create(data: NotificationCreate): Promise<Notification>;
}

export class InMemoryNotificationRepo implements NotificationRepo {
  constructor(seed?: Notification[]);
  /** Solo para tests: lo guardado hasta ahora. No forma parte de la interface. */
  readonly items: readonly Notification[];
}
```

```ts
// src/repositories/prisma-notification.repo.ts
export class PrismaNotificationRepo implements NotificationRepo {
  constructor(prisma: PrismaClient);
}
// existsForIncident → prisma.notification.count({ where: { incidentId, template } }) > 0
// create            → prisma.notification.create({ data })
```

```ts
// src/services/messaging.service.ts — cambios sobre la B2
export const POST_VISIT_TEMPLATE_ID = 'post_visit';

export type PostVisitSkipReason = 'NO_MANAGER' | 'ALREADY_SENT';

export type PostVisitResult = {
  sent: { recipientId: string; role: PostVisitRole; providerMessageId: string }[];
  failed: { recipientId: string; role: PostVisitRole; error: string }[];
  skipped: { role: PostVisitRole; reason: PostVisitSkipReason }[]; // antes: role 'MANAGER', reason 'NO_MANAGER'
};

export type MessagingPostVisitNotifierOptions = {
  messaging: MessagingService;
  incidentRepo: IncidentRepo;
  notificationRepo: NotificationRepo;   // nuevo (B3)
};
```

- `PostVisitNotifier` y la firma de `sendPostVisit` **no cambian** (la A4 no se entera).
- Ampliar `skipped` es compatible: lo que devolvía la B2 sigue siendo válido.
- Con `ALREADY_SENT`, `skipped` trae una entrada por cada destinataria que habría recibido el SMS (gestora si existe, inquilina). `sent` y `failed` van vacíos.

## 6. Manejo de errores

| Caso | Qué pasa |
| ---- | -------- |
| La incidencia no existe | Lanza `Error` («Incident {id} not found»); no consulta `Notification` ni envía (igual que la B2) |
| Ya enviado | No lanza; devuelve `skipped` con `ALREADY_SENT` y log `info` |
| `sendSms` falla para una destinataria | `Notification` `FAILED` con el nombre del error; se sigue con la otra |
| Fallan los dos SMS | 2 `Notification` `FAILED`; `sent` vacío; no lanza |
| `notificationRepo` falla (p. ej. BD caída) | Se propaga (lo gestiona la A4). Ver riesgo en §7 |

## 7. Casos límite y riesgos

| Caso | Qué pasa |
| ---- | -------- |
| Sin gestora | Solo 1 `Notification` (inquilina); `skipped: [{ role: 'MANAGER', reason: 'NO_MANAGER' }]` |
| Ya enviado y sin gestora | `skipped: [{ role: 'TENANT', reason: 'ALREADY_SENT' }]` |
| El envío anterior falló (`FAILED`) | No se reenvía (Q4) |
| Dos `session.end` a la vez | Los dos pueden pasar la comprobación y enviar el SMS dos veces. Riesgo aceptado (Q6) |
| SMS enviado pero falla el `create` | Ese SMS queda sin registro y no se envía a la siguiente; un `session.end` repetido lo reenviaría. Riesgo aceptado (BD local en el MVP) |

## 8. Criterios de aceptación

- [ ] **CA-1 · Registro correcto:** Dada una incidencia con gestora e inquilina y sin `Notification`, cuando llamo a `sendPostVisit`, entonces se envían 2 SMS y se crean 2 `Notification` con `status = QUEUED`, `template = "post_visit"`, su `recipientId`, su `providerMessageId` y `sentAt` con fecha.
- [ ] **CA-2 · Idempotencia:** Dada una incidencia que ya tiene una `Notification` `post_visit`, cuando llamo a `sendPostVisit`, entonces no se llama a `sendSms`, no se crea ninguna `Notification` y `skipped` trae `ALREADY_SENT` para cada destinataria.
- [ ] **CA-3 · Llamada repetida:** Cuando llamo a `sendPostVisit` dos veces seguidas con la misma incidencia, entonces `sendSms` se llama 2 veces en total (no 4) y hay 2 `Notification`.
- [ ] **CA-4 · Un SMS falla:** Si `sendSms` falla con la gestora, entonces se crea su `Notification` en `FAILED` con el nombre del error y `sentAt = null`, y la de la inquilina en `QUEUED`.
- [ ] **CA-5 · No reintenta:** Dada una incidencia con una `Notification` `FAILED`, cuando llamo a `sendPostVisit`, entonces no se envía nada (`ALREADY_SENT`).
- [ ] **CA-6 · Sin gestora:** se crea solo la `Notification` de la inquilina y `skipped` trae `NO_MANAGER`.
- [ ] **CA-7 · Incidencia inexistente:** lanza error, no se envía ni se crea nada.
- [ ] **CA-8 · Datos personales:** ni los logs ni `Notification.error` contienen teléfonos ni el texto del SMS.
- [ ] **CA-9 · Repo en memoria:** `existsForIncident` devuelve `true` solo si hay un registro con ese `incidentId` **y** ese `template`.
- [ ] **CA-10 · Sin regresiones:** los tests de la B2 siguen en verde (con `InMemoryNotificationRepo` vacío) y `pnpm check` y `pnpm test` pasan.

## 9. Diseño técnico

- **Nuevo** `src/repositories/notification.repo.ts`: tipos, interface e `InMemoryNotificationRepo` (mismo patrón que `video-session.repo.ts`; `create` genera `id`, `channel = 'SMS'`, `createdAt` y `updatedAt`).
- **Nuevo** `src/repositories/prisma-notification.repo.ts`: `count` + `create`. Sin test unitario (necesita Postgres; queda para B5/integración).
- **Cambia** `src/services/messaging.service.ts`:
  - `POST_VISIT_TEMPLATE_ID`, `PostVisitSkipReason` y el tipo `skipped` ampliado.
  - `MessagingPostVisitNotifier` recibe `notificationRepo`; añade la comprobación del paso 2 y un `create` en cada rama del `try/catch` del bucle.
- **Cambia** el test de la B2: pasar un `InMemoryNotificationRepo` al construir el notifier (solo para que compile).
- **Nuevo** test `src/__tests__/notification.repo.test.ts` (CA-9) y casos nuevos en el test del notifier (CA-1 a CA-8).
- **No** se toca `app.ts`, `openapi.yaml` ni `schema.prisma`.

## 10. Decisiones (Q1–Q6)

Acordadas el 21/11/2026 (ver `01-requirements.md` §3). Pendiente de publicar en el issue.

- **Q1:** sin reintentos; fallo → `FAILED`. · ✅
- **Q2:** envío correcto → `QUEUED` + `providerMessageId` + `sentAt`. · ✅
- **Q3:** clave `incidentId` + `template`; si existe → `ALREADY_SENT`. · ✅
- **Q4:** un `FAILED` previo no se reenvía. · ✅
- **Q5:** la idempotencia vive en `sendPostVisit`. · ✅
- **Q6:** envíos simultáneos: riesgo aceptado en el MVP. · ✅

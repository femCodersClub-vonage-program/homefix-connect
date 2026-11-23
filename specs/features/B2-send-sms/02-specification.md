# B2 · Aviso post-visita por SMS (`sendPostVisit`) — Especificación

> Issue: #13 · Rama: `feat/B2-send-sms` · Requisitos: `01-requirements.md` · Estado: borrador (decisiones Q1–Q6 cerradas, 20/11)

## 1. Resumen y contexto

Cuando termina la videollamada, la gestora y la inquilina reciben un SMS que confirma que la visita se ha hecho. La B2 implementa `sendPostVisit(incidentId, technicianName)`, que busca la incidencia, monta el texto con la plantilla post-visita y envía los 2 SMS con `MessagingService.sendSms` (el cliente de B1).

La llamará la A4 (#10) al recibir `session.end`. La B3 la ampliará para guardar las 2 `Notification` con el `providerMessageId` que devuelve.

## 2. Alcance

**Entra:**

- Interface `PostVisitNotifier` y la clase `MessagingPostVisitNotifier` en `src/services/messaging.service.ts`.
- La plantilla post-visita.
- Ampliar `IncidentRepo.findById` para que traiga `tenant` y `manager` (stub en memoria y Prisma).
- Tests unitarios con `MessagingService` e `IncidentRepo` de prueba (sin red ni Postgres).

**No entra:**

- Guardar las `Notification`, idempotencia y reintentos (→ B3).
- Llamar a `sendPostVisit` desde el webhook `session.end` (→ A4).
- Conectar nada en `app.ts` (→ A4/B3).
- Webhook `message.status` (→ B4, post-MVP).

## 3. Requisitos funcionales

| ID   | Requisito | Fuente |
| ---- | --------- | ------ |
| RF-1 | `sendPostVisit(incidentId, technicianName)` envía el SMS post-visita a la gestora y a la inquilina de la incidencia | E-01 · E-03 |
| RF-2 | El texto sigue exactamente la plantilla post-visita (§4) | E-02 |
| RF-3 | Los teléfonos salen solo de `User.phone` de cada destinataria | E-04 |
| RF-4 | Cada SMS se envía con `MessagingService.sendSms(phone, body)` | E-05 |
| RF-5 | Orden: primero la gestora, después la inquilina | Q5 |
| RF-6 | Sin gestora: solo a la inquilina, log `warn` y la gestora aparece en `skipped` | D-02 |
| RF-7 | Si falla un SMS, se envía el otro igual; el fallo aparece en `failed` y no se lanza error | Q4 |
| RF-8 | Devuelve `{ sent, failed, skipped }` (§5) | Q3 · D-04 |
| RF-9 | Si `technicianName` llega vacío, se usa `incident.technician.name` | Q2 |
| RF-10 | Incidencia inexistente → error, sin enviar nada | D-03 |
| RF-11 | `IncidentRepo.findById` incluye `tenant` y `manager` | D-01 |
| RF-12 | Logs sin el texto del SMS ni teléfonos; solo ids y rol | D-05 |
| RF-13 | El service no importa `express`; se testea sin Postgres | D-06 |

## 4. Reglas de negocio

- **Plantilla** (literal, del issue):
  `Visita realizada para la incidencia «{titulo}» por {tecnica}. Cuando el informe esté listo te notificaremos.`
  - `{titulo}` = `incident.title`.
  - `{tecnica}` = `technicianName` (o `incident.technician.name` si llega vacío).
- **Destinatarias:** `incident.manager` (rol `MANAGER`) e `incident.tenant` (rol `TENANT`). La técnica no recibe SMS.
- **Sin gestora:** `managerId` es opcional; la inquilina siempre existe (`tenantId` es obligatorio).
- **No valida el estado** de la incidencia (Q6): lo controla la A4.
- **No reintenta:** un fallo se informa en `failed`; los reintentos son de la B3.

## 5. Contrato

```ts
type PostVisitRole = 'MANAGER' | 'TENANT';

type PostVisitResult = {
  sent: { recipientId: string; role: PostVisitRole; providerMessageId: string }[];
  failed: { recipientId: string; role: PostVisitRole; error: string }[];
  skipped: { role: 'MANAGER'; reason: 'NO_MANAGER' }[];
};

interface PostVisitNotifier {
  sendPostVisit(incidentId: string, technicianName: string): Promise<PostVisitResult>;
}

class MessagingPostVisitNotifier implements PostVisitNotifier {
  constructor(options: { messaging: MessagingService; incidentRepo: IncidentRepo });
}
```

- `failed[].error` = nombre del error que lanzó `sendSms` (p. ej. `VonageNetworkError`), para que la B3 sepa si reintentar.
- `MessagingService` (X1/B1) **no cambia**.

**Cambio en X1** (`src/repositories/incident.repo.ts`):

```ts
export type IncidentWithRelations = Prisma.IncidentGetPayload<{
  include: {
    technician: true;
    tenant: true;   // nuevo (B2)
    manager: true;  // nuevo (B2)
    visit: { include: { videoSession: true } };
  };
}>;
```

`PrismaIncidentRepo.findById` añade `tenant: true, manager: true` al `include`.

## 6. Manejo de errores

| Caso | Qué pasa |
| ---- | -------- |
| La incidencia no existe | Lanza `Error` («Incident {id} not found») y no envía nada |
| `technicianName` vacío y la incidencia no tiene técnica | Lanza `Error` («Falta el nombre de la técnica») y no envía nada |
| `sendSms` falla para una destinataria | Se añade a `failed` con el nombre del error y se sigue con la otra |
| Fallan los dos SMS | `sent` vacío, los dos en `failed`; no lanza |
| Error de `IncidentRepo` (p. ej. BD caída) | Se propaga (lo gestiona quien llama: A4) |

## 7. Casos límite

| Caso | Qué pasa |
| ---- | -------- |
| Sin gestora | Solo a la inquilina; `skipped: [{ role: 'MANAGER', reason: 'NO_MANAGER' }]`; log `warn` |
| `User.phone` vacío o mal formado | `sendSms` (B1) lanza `VonageValidationError` → va a `failed` |
| Título con comillas o caracteres especiales | Se inserta tal cual en la plantilla |
| Texto de más de 160 caracteres | Se envía igual (B1 no lo corta) |
| `technicianName` con espacios alrededor | Se usa recortado (`trim`) |

## 8. Criterios de aceptación

- [ ] **CA-1 · Envío correcto:** Dada una incidencia con gestora e inquilina, cuando llamo a `sendPostVisit`, entonces se llama a `sendSms` 2 veces (gestora → inquilina) con su `phone` y el texto de la plantilla, y `sent` trae las 2 con su `providerMessageId`.
- [ ] **CA-2 · Plantilla:** El texto es exactamente `Visita realizada para la incidencia «{titulo}» por {tecnica}. Cuando el informe esté listo te notificaremos.`
- [ ] **CA-3 · Sin gestora:** Dada una incidencia sin gestora, se envía solo a la inquilina, `skipped` trae a la gestora y se loguea un `warn`.
- [ ] **CA-4 · Un SMS falla:** Si `sendSms` falla con la gestora, se envía igual a la inquilina; `failed` trae a la gestora con el nombre del error y `sent` a la inquilina.
- [ ] **CA-5 · Incidencia inexistente:** lanza error y no se llama a `sendSms`.
- [ ] **CA-6 · Nombre de la técnica:** con `technicianName` vacío se usa `incident.technician.name`; si tampoco hay técnica, lanza error sin enviar.
- [ ] **CA-7 · Logs:** no incluyen el texto del SMS ni teléfonos.
- [ ] **CA-8 · Repo:** `findById` devuelve `tenant` y `manager` (stub y Prisma) y los tests existentes (A3, X1) siguen en verde.
- [ ] **CA-9 · Calidad:** `pnpm check` y `pnpm test` pasan sin errores.

## 9. Diseño técnico

- `src/services/messaging.service.ts`:
  - `POST_VISIT_TEMPLATE` y una función pura `buildPostVisitBody(title, technicianName)`.
  - Tipos `PostVisitRole`, `PostVisitResult`, interface `PostVisitNotifier`.
  - `MessagingPostVisitNotifier({ messaging, incidentRepo })`: `findById` → valida → construye el texto → recorre `[manager, tenant]` con `try/catch` por destinataria → devuelve el resultado.
- `src/repositories/incident.repo.ts`: añadir `tenant` y `manager` al tipo `IncidentWithRelations`.
- `src/repositories/prisma-incident.repo.ts`: añadir `tenant: true, manager: true` al `include`.
- Fixtures de `stubs.test.ts` y `video-tokens.test.ts`: añadir `tenant` y `manager` (solo para que compilen).
- **No** se toca `app.ts`, `openapi.yaml` ni `schema.prisma`.

## 10. Decisiones (Q1–Q6 + alcance)

Decididas el 20/11/2026 y anotadas en el #13.

- **Alcance:** B2 = `sendPostVisit` (plantilla + 2 SMS). B3 = `Notification` + idempotencia + reintentos. · ✅
- **Teléfonos:** ampliar `IncidentRepo.findById` con `tenant` y `manager`. · ✅
- **Sin gestora:** solo a la inquilina + log `warn`, sin error. · ✅
- **Q1:** interface nueva `PostVisitNotifier`; `MessagingService` y B1 no cambian. · ✅
- **Q2:** `technicianName` es parámetro; vacío → `incident.technician.name`. · ✅
- **Q3:** devuelve `{ sent, failed, skipped }`. · ✅
- **Q4:** si falla un SMS se envía el otro; el fallo va en `failed`. · ✅
- **Q5:** gestora → inquilina. · ✅
- **Q6:** no valida el estado de la incidencia. · ✅

## 11. Estrategia de pruebas

- **Unit (Vitest)** en `src/__tests__/post-visit.test.ts`, con `MessagingService` mockeado (`vi.fn()`) e `InMemoryIncidentRepo` con fixtures. Sin red ni Postgres.
- Un test por criterio CA-1 a CA-7.
- CA-8: los tests de `stubs.test.ts` y `video-tokens.test.ts` siguen en verde tras ampliar los fixtures.
- Antes del PR: `pnpm check` + `pnpm test` en verde.

## 12. Dependencias

- **X1** (`IncidentRepo`, `MessagingService`, stubs): en `main` ✅.
- **B1** (#12, PR #43): la B2 solo usa la interface `MessagingService`, así que no espera al merge. El cliente real se conecta en A4/B3.
- **Bloquea a:** A4 (#10, llama a `sendPostVisit`) y B3 (#14, guarda las `Notification`).

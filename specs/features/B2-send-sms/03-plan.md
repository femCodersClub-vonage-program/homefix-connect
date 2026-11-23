# B2 · Aviso post-visita por SMS — Plan de implementación

> Spec: [`02-specification.md`](./02-specification.md) · Issue: #13 · Estado: borrador, pendiente de aprobación

## 1. Ficheros afectados

| Etiqueta   | Fichero | Qué y por qué |
| ---------- | ------- | ------------- |
| `[MODIFY]` | `backend/src/repositories/incident.repo.ts` | Añadir `tenant` y `manager` a `IncidentWithRelations` (RF-11) |
| `[MODIFY]` | `backend/src/repositories/prisma-incident.repo.ts` | Añadir `tenant: true, manager: true` al `include` de `findById` |
| `[MODIFY]` | `backend/src/__tests__/stubs.test.ts` | Fixture con `tenant` y `manager` (solo para que compile) |
| `[MODIFY]` | `backend/src/__tests__/video-tokens.test.ts` | Ídem |
| `[MODIFY]` | `backend/src/services/messaging.service.ts` | `POST_VISIT_TEMPLATE`, `buildPostVisitBody`, tipos `PostVisitRole` / `PostVisitResult`, interface `PostVisitNotifier` y clase `MessagingPostVisitNotifier` |
| `[NEW]`    | `backend/src/__tests__/post-visit.test.ts` | Tests CA-1 a CA-7 |

Sin cambios en `app.ts`, `openapi.yaml`, `schema.prisma` ni en `MessagingService` / cliente de B1.

> ⚠️ Mientras el #43 (B1) no esté en `main`, `messaging.service.ts` de esta rama no tiene `VonageMessagesClient`. La B2 añade su código al final del archivo; al mergear `main` puede haber un conflicto sencillo en ese archivo (los dos añaden al final). Se resuelve dejando las dos partes.

## 2. Estrategia de pruebas (TDD)

**Fase roja:** `post-visit.test.ts` con CA-1 a CA-7 → fallan porque no existe `MessagingPostVisitNotifier`. Antes, ampliar el tipo y los fixtures y comprobar que los tests existentes siguen en verde (CA-8).

**Fase verde:** implementar hasta que pasen.

**Dobles de prueba:**

- `MessagingService` falso: `{ sendSms: vi.fn().mockResolvedValueOnce({ providerMessageId: 'msg-gestora' }).mockResolvedValueOnce({ providerMessageId: 'msg-inquilina' }) }`.
- Fallo de un SMS: `mockRejectedValueOnce(Object.assign(new Error('x'), { name: 'VonageNetworkError' }))` (sin importar la B1, que aún no está en `main`).
- `InMemoryIncidentRepo` con una incidencia de prueba con técnica, inquilina y gestora (y otra sin gestora). Teléfonos del seed (`+3460000000x`), nunca reales.
- Logger mockeado (`vi.mock('../lib/logger.js')`) para CA-3 y CA-7.

## 3. Orden de ejecución

1. ✅ Spec y decisiones Q1–Q6 en el #13.
2. Ampliar `IncidentWithRelations` + `PrismaIncidentRepo` + fixtures → `pnpm test` en verde (CA-8).
3. Fase roja: `post-visit.test.ts`.
4. Fase verde: plantilla, tipos, interface y `MessagingPostVisitNotifier`.
5. `pnpm check` + `pnpm test`.
6. Si el #43 ya está en `main`: `git merge main` y resolver el posible conflicto en `messaging.service.ts`.
7. `04-validation.md` y PR con `Closes #13`, avisando en la descripción del cambio en X1 (`IncidentRepo`).

## 4. Riesgos y mitigaciones

| Riesgo | Mitigación |
| ------ | ---------- |
| Ampliar `IncidentWithRelations` rompe tipos en tests de otras tareas | Solo se añaden `tenant` y `manager` a los fixtures; se avisa en el PR |
| Conflicto en `messaging.service.ts` con la B1 (#43) | Cada una añade al final; resolver dejando ambas partes |
| Otra tarea abierta toca `incident.repo.ts` a la vez | Revisar PRs abiertos antes del PR; el cambio es pequeño |
| El equipo prefiere otro reparto B2/B3 | Se ajusta la spec; el código de la B2 es pequeño y se mueve fácil |

## 5. Pendiente

- Aprobación de este plan (Carolina).
- Respuesta del equipo a las decisiones del #13 (no bloquea).
- Merge del #43 (no bloquea la B2; sí la conexión real en A4/B3).

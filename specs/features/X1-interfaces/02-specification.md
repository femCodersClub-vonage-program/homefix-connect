# 02 — Specification · X1 · Interfaces + stubs

> **Issue:** [#4](https://github.com/femCodersClub-vonage-program/homefix-connect/issues/4)
> **Rama:** `feat/X1-interfaces` · **PR:** [#30](https://github.com/femCodersClub-vonage-program/homefix-connect/pull/30)
> **Estado:** implementado y aprobado. Documento reconstruido para el framework SDD.

---

## 1. Objetivo

Definir los contratos TypeScript (interfaces) y sus implementaciones en memoria
(stubs) de los servicios y repositorios que consumen los carriles A, B y C,
permitiendo testear y desarrollar sin Vonage ni PostgreSQL.

---

## 2. Alcance

### Dentro

- `VideoService` + `InMemoryVideoService`.
- `MessagingService` + `InMemoryMessagingService`.
- `IncidentRepo` + `InMemoryIncidentRepo`.
- `VideoSessionRepo` + `InMemoryVideoSessionRepo`.
- Tipos derivados de Prisma: `IncidentWithRelations`, `VideoSessionWithVisit`,
  `VideoSessionUpdate`.
- Tests de contrato de los cuatro stubs.

### Fuera

- Llamadas reales a Vonage (A1/A2/B1/B2) o a Prisma (A3/A4/B3).
- Rutas, controladores, middlewares o webhooks.
- Validación de estados de negocio (A3/A4).
- Cambios en `openapi.yaml` o `schema.prisma`.
- Creación de `VideoSession` (las sesiones existen desde la visita).

---

## 3. Contratos

### 3.1 `VideoService` — `backend/src/services/video.service.ts`

```ts
export interface VideoService {
  createSession(visitId: string): Promise<{ sessionId: string }>;
  generateToken(
    sessionId: string,
    role: Role,
  ): Promise<{ token: string; expiresAt: Date }>;
}
```

- `Role` es el enum de Prisma (`TENANT | TECHNICIAN | MANAGER`); el uso esperado
  es `TENANT`/`TECHNICIAN`.
- Stub: `sessionId` no vacío derivado de `visitId`; token no vacío y
  `expiresAt` en el futuro (1 hora).
- La implementación real (A1/A2) debe cumplir esta misma interface.

### 3.2 `MessagingService` — `backend/src/services/messaging.service.ts`

```ts
export interface MessagingService {
  sendSms(to: string, body: string): Promise<{ providerMessageId: string }>;
}
```

- Stub: devuelve un `providerMessageId` no vacío y distinto por llamada.
- La implementación real (B1/B2) debe cumplir esta misma interface.

### 3.3 `IncidentRepo` — `backend/src/repositories/incident.repo.ts`

```ts
export type IncidentWithRelations = Prisma.IncidentGetPayload<{
  include: { technician: true; visit: { include: { videoSession: true } } };
}>;

export interface IncidentRepo {
  findById(id: string): Promise<IncidentWithRelations | null>;
  updateStatus(id: string, status: IncidentStatus): Promise<Incident>;
}
```

- `findById`: devuelve `null` si no existe.
- `updateStatus`: persiste el nuevo estado y lo devuelve; **lanza error** si el id
  no existe.

### 3.4 `VideoSessionRepo` — `backend/src/repositories/video-session.repo.ts`

```ts
export type VideoSessionWithVisit = Prisma.VideoSessionGetPayload<{
  include: { visit: true };
}>;

export type VideoSessionUpdate = {
  vonageSessionId?: string | null;
  status?: VideoSessionStatus;
  startedAt?: Date | null;
  endedAt?: Date | null;
};

export interface VideoSessionRepo {
  findByVisitId(visitId: string): Promise<VideoSession | null>;
  findByVonageSessionId(
    vonageSessionId: string,
  ): Promise<VideoSessionWithVisit | null>;
  update(id: string, data: VideoSessionUpdate): Promise<VideoSession>;
}
```

- `findByVisitId` / `findByVonageSessionId`: devuelven `null` si no existe.
- `findByVonageSessionId` incluye `visit` para que A4 obtenga el `incidentId`.
- `update`: aplica **solo los campos definidos** (`undefined` no borra; `null`
  limpia) y **lanza error** si el id no existe.
- No existe `create`: la sesión se crea con la visita (seed en `PENDING`). A1
  guarda el `vonageSessionId`, A3 la activa y A4 la cierra.

---

## 4. Semántica de errores

| Operación | No encontrado |
|---|---|
| `IncidentRepo.findById` | `null` |
| `VideoSessionRepo.findBy*` | `null` |
| `IncidentRepo.updateStatus` | lanza `Error("Incident <id> not found")` |
| `VideoSessionRepo.update` | lanza `Error("VideoSession <id> not found")` |

Los stubs no conocen HTTP: los códigos (`404`, `409`, `400`) se deciden en las
rutas/servicios que los consumen.

---

## 5. Criterios de aceptación (Given/When/Then)

1. **VideoService.createSession**
   Given un `InMemoryVideoService`
   When `createSession('visit_demo')`
   Then devuelve un `sessionId` no vacío.

2. **VideoService.generateToken**
   Given una sesión creada
   When `generateToken(sessionId, 'TENANT')`
   Then devuelve `token` no vacío y `expiresAt` posterior a ahora.

3. **MessagingService.sendSms**
   Given un `InMemoryMessagingService`
   When `sendSms(to, body)`
   Then devuelve un `providerMessageId` no vacío.

4. **IncidentRepo.findById**
   Given una incidencia sembrada
   Then `findById` la devuelve; Given un id inexistente, Then `null`.

5. **IncidentRepo.updateStatus**
   Given una incidencia existente
   When se actualiza el estado
   Then el nuevo estado se persiste y se devuelve; Given un id inexistente,
   Then lanza error.

6. **VideoSessionRepo.findByVisitId / findByVonageSessionId**
   Given una sesión sembrada
   Then se encuentra por visita; Given un `vonageSessionId`, Then devuelve la
   sesión con su `visit`; Given ids inexistentes, Then `null`.

7. **VideoSessionRepo.update**
   Given una sesión existente
   When se guarda `vonageSessionId` y `status: ACTIVE`
   Then se persiste; When se cierra (`ENDED`, `endedAt`) Then conserva el
   `vonageSessionId`; Given un id inexistente, Then lanza error.

---

## 6. Decisiones

- Interfaces y stubs en el **mismo archivo** (criterio fijo del issue).
- `VideoSessionRepo` dedicado en vez de ampliar `IncidentRepo` (agregados
  distintos; lo consumen A1/A3/A4).
- Tipos derivados de Prisma; enums reutilizados de `@prisma/client`.
- Sin cambios en `openapi.yaml` ni `schema.prisma`.
- Sin cableado en rutas: cada tarea consumidora lo hará en su PR.

---

## 7. Trazabilidad

| Consumidor | Interface |
|---|---|
| A1, A2, A3 | `VideoService`, `IncidentRepo`, `VideoSessionRepo` |
| A4 | `VideoSessionRepo` |
| B1, B2, B3 | `MessagingService` |
| C1, C2 | Contrato de la API (indirecto) |

---

## 8. Riesgos

- Las firmas pueden requerir ajustes al cerrar **T1** (p. ej. `applicationId` en
  la respuesta del token); se reconcilia en el PR de la tarea que lo consuma.
- Los stubs no validan estados: esa lógica vive en A3/A4.
- `InMemory*` no sustituye a Prisma en integración; solo unitarios.

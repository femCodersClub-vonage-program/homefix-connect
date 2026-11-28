# E3-01 · GET /api/incidents/{id}/notifications — Requisitos

> Issue: #73 · Asignada a Caro-it (26/11) · Rama: `feat/E3-01-notifications-endpoint` (apilada sobre `feat/E2-01-message-status` → `feat/E2-02` → `spec/E1-01`) · Depende de: E1-01 (#67), E2 (#71, #72) · Lo usan E3-03 y E4-01
> Base: `docs/MVP_EXTENDED.md` §6 (E3) · contrato `NotificationList` / `Notification` en `openapi.yaml` (E1-01)

## 1. Requisitos

### Explícitos (issue #73)

| ID | Requisito |
| -- | --------- |
| E-01 | Solo participantes de la incidencia (inquilina, técnica, gestora); si no, 403 |
| E-02 | Devuelve `id`, `recipient {id, name, role}`, `channel`, `status`, `template`, `sentAt`, `deliveredAt`, `error` |
| E-03 | Sin teléfonos ni emails |
| E-04 | 403 / 404 correctos |
| E-05 | Contrato + tests |

### Derivados

| ID | Requisito | Justificación |
| -- | --------- | ------------- |
| D-01 | Tampoco sale `providerMessageId` | No está en el schema `Notification` del contrato |
| D-02 | Orden: de la más antigua a la más nueva (`createdAt`) | Lectura natural en la vista de gestora |
| D-03 | Lista vacía → `200 { notifications: [] }` | Contrato: «puede estar vacía» |
| D-04 | Participante = id **y** rol coinciden con el campo de la incidencia | Igual que `POST /video-tokens` |

## 2. Preguntas de clarificación

| # | Pregunta | Opciones | Propuesta |
| - | -------- | -------- | --------- |
| Q1 | Cabeceras ausentes o rol inválido: ¿400 o 401? (el issue dice 401, el contrato de E1-01 dice 400) | A) 400 (contrato) · B) 401 | **A**, igual que E1-02: si se quiere 401, PR `spec/` para todos a la vez |
| Q2 | Orden de comprobaciones | A) 400 → 404 → 403 (como E0-05) · B) 400 → 403 → 404 | **A** |
| Q3 | ¿Dónde se une la destinataria? | A) En el repo (`include recipient`) · B) En la ruta, con las personas de la incidencia | **A**: una sola consulta y vale para cualquier destinataria |

## 3. Fuera de alcance

- Vista de gestora (E3-03) y toast (E4-01).
- Paginación.

## 4. Decisiones de clarificación acordadas

Carolina, 26/11 (opciones recomendadas): **Q1 = A**, **Q2 = A**, **Q3 = A**.

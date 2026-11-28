# E1-02 · Backend: cambiar estado de visita — Requisitos

> Issue: #68 · Asignada a Caro-it (26/11) · Rama: `feat/E1-02-visit-status` (apilada sobre `fix/E4-02-notification-unique` → `spec/E1-01-visit-lifecycle`) · Depende de: E1-01 (#67), E4-02 (#82) · **Bloquea** E1-03, E1-04, E3-02
> Base: `docs/MVP_EXTENDED.md` §3.5, §4.2, §7.1 · contrato en `openapi.yaml` (E1-01)

## 1. Requisitos

### Explícitos (issue #68 + `MVP_EXTENDED.md`)

| ID | Requisito | Fuente |
| -- | --------- | ------ |
| E-01 | Solo la técnica asignada (`X-User-Role: TECHNICIAN` + `technicianId`) | #68 · §7.1 |
| E-02 | `COMPLETED` → `Visit.COMPLETED` + `completedAt = now` + `Incident.VIDEO_COMPLETED` + SMS una vez | #68 · §7.1 |
| E-03 | `CANCELLED` → `Visit.CANCELLED` + `completedAt = null` + `Incident.VISIT_ASSIGNED`, sin SMS | #68 · §7.1 |
| E-04 | Corrección `COMPLETED ↔ CANCELLED` mientras `Incident ≠ CLOSED` | #68 · §3.5 |
| E-05 | Mismo estado → `200 { status: "unchanged" }` | §7.1 |
| E-06 | Si un SMS falla, la visita queda en el estado elegido y el resumen lo cuenta en `failed` | §7.1 |
| E-07 | 400 / 403 / 404 / 409 / 500 | #68 · contrato |
| E-08 | Unit + contrato + integración | #68 |

### Derivados

| ID | Requisito | Justificación |
| -- | --------- | ------------- |
| D-01 | Visita e incidencia cambian en **una transacción** | No dejar estados a medias |
| D-02 | Primero se guarda el estado y después los SMS | Igual que A4 (Q4) |
| D-03 | `notifications` = `{ sent, failed, skipped }` (números) solo al pasar a `COMPLETED` | Contrato E1-01 · Q3 de E1-01 |
| D-04 | Los SMS de la corrección `CANCELLED → COMPLETED` no se duplican | E4-02 |

## 2. Preguntas de clarificación

| # | Pregunta | Opciones | Propuesta |
| - | -------- | -------- | --------- |
| Q1 | Cabeceras ausentes o rol inválido: ¿400 o 401? (el issue dice «401 auth», el contrato de E1-01 dice 400) | A) 400, como el contrato y `POST /video-tokens` · B) 401, como E0-05 | **A**: se implementa lo que dice el contrato aprobado; si se quiere 401, se cambia en un PR `spec/` para los 3 endpoints a la vez |
| Q2 | ¿Qué estado de `VideoSession` se exige? (el issue dice «sesión ACTIVE») | A) `ACTIVE` o `ENDED` (hubo llamada) · B) Solo `ACTIVE` | **A**: con B la técnica no podría corregir después de colgar (la sesión pasa a `ENDED`) |
| Q3 | Visita `PENDING` (sin confirmar) | A) 409 · B) Tratarla como `CONFIRMED` | **A**: §3.5 solo permite salir de `CONFIRMED`, `COMPLETED` o `CANCELLED` |
| Q4 | Si `sendPostVisit` lanza (no un SMS fallido, sino un error de BD) | A) 200 `completed` sin `notifications` + log `error` · B) 500 | **A**: la visita ya está guardada; el toast (E4-01) usa el mensaje neutro si falta el resumen. Igual que A4 |

## 3. Fuera de alcance

- Botones en el front (E1-03).
- Fallback de `sessionDestroyed` y cierre de `VideoSession` (E1-04 / E0-02).
- Cierre por la gestora (E3-02).

## 4. Decisiones de clarificación acordadas

Carolina, 26/11 (opciones recomendadas): **Q1 = A**, **Q2 = A**, **Q3 = A**, **Q4 = A**.

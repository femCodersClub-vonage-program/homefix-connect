# E3-02 · POST /api/incidents/{id}/close — Requisitos

> Issue: #74 · Asignada a Caro-it (26/11) · Rama: `feat/E3-02-close-incident` (apilada sobre `feat/E1-02-visit-status`) · Depende de: E1-01, E1-02, E0-05 · Lo usa E3-03
> Base: `docs/MVP_EXTENDED.md` §7.1 · contrato en `openapi.yaml` (E1-01)

## 1. Requisitos (issue #74 + §7.1)

| ID | Requisito |
| -- | --------- |
| E-01 | Solo la gestora asignada (`X-User-Role: MANAGER` + `managerId`) |
| E-02 | Requiere Visit `COMPLETED` e Incident `VIDEO_COMPLETED`; si no, 409 `Report not ready` |
| E-03 | Pasa la incidencia a `CLOSED` → `200 { status: "closed" }` |
| E-04 | Idempotente: ya cerrada → `200 { status: "already_closed" }` |
| E-05 | 403 / 404 / 409 · unit + contrato + integración |

### Derivados

| ID | Requisito | Justificación |
| -- | --------- | ------------- |
| D-01 | Comprobar y cerrar en **un solo UPDATE** (`updateMany` con la condición) | Si la técnica corrige a No completada a la vez, no se cierra una incidencia sin informe |
| D-02 | Una vez CLOSED, `visit-status` responde 409 | Ya lo hace E1-02 (§3.5) |
| D-03 | Incidencia sin gestora → 403 | Nadie puede cerrarla |

## 2. Preguntas de clarificación

| # | Pregunta | Opciones | Propuesta |
| - | -------- | -------- | --------- |
| Q1 | Cabeceras ausentes o rol inválido: ¿400 o 401? (el issue dice 401, el contrato 400) | A) 400 (contrato) · B) 401 | **A**, igual que E1-02 y E3-01 |
| Q2 | Orden: ¿`already_closed` antes o después del 403? | A) 404 → 403 → already_closed → 409 · B) already_closed antes del 403 | **A**: a quien no es la gestora no se le dice nada de la incidencia |
| Q3 | ¿Depende del código de E0-05 (#80)? | A) No: comprobación propia de rol + `managerId` · B) Apilar sobre E0-05 | **A**: E0-05 solo toca `GET /incidents/:id`; aquí la regla es «solo la gestora» |

## 3. Decisiones de clarificación acordadas

Carolina, 26/11 (opciones recomendadas): **Q1 = A**, **Q2 = A**, **Q3 = A**.

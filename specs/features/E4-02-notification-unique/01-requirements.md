# E4-02 · Idempotencia por destinataria — Requisitos

> Issue: #82 · Asignada a Caro-it (26/11) · Rama: `fix/E4-02-notification-unique` (apilada sobre `spec/E1-01-visit-lifecycle`) · Depende de: E1-01 (#67, PR #77) · **Bloquea** E1-02 (#68)
> Base: `docs/MVP_EXTENDED.md` §6 (E4) · unique de E1-01 en `schema.prisma`

## 1. Requisitos

### Explícitos (`MVP_EXTENDED.md` §6 + issue #82)

| ID | Requisito | Fuente |
| -- | --------- | ------ |
| E-01 | Usar la `@@unique([incidentId, template, recipientId])` de E1-01 | §6 E4-02 |
| E-02 | Dejar de bloquear a todas las destinatarias si una ya tiene registro | §6 E4-02 |
| E-03 | `P2002` al guardar = `ALREADY_SENT` | §6 E4-02 |
| E-04 | Tests | §6 E4-02 |

### Derivados

| ID | Requisito | Justificación |
| -- | --------- | ------------- |
| D-01 | Un registro `FAILED` sigue contando como enviado: no se reintenta | ADR-012 · B3 CA-5 |
| D-02 | Solo el `P2002` de la unique por destinataria es `ALREADY_SENT`; el de `providerMessageId` u otros errores de BD se propagan | No esconder fallos reales |
| D-03 | El stub en memoria aplica la misma unique | Tests unitarios fieles a Postgres |
| D-04 | Si todas las destinatarias ya tienen registro, no se exige el nombre de la técnica | Antes (B3) se devolvía antes de mirarlo |

## 2. Preguntas de clarificación

| # | Pregunta | Opciones | Propuesta |
| - | -------- | -------- | --------- |
| Q1 | ¿Cómo se comprueba «ya enviado»? | A) Consulta previa por destinataria + P2002 como red · B) Reservar la fila antes de enviar el SMS (create QUEUED → enviar → update) | **A**: es lo que pide §6, no toca el flujo de la B3 ni choca con el `updateStatus` de la E2-02. Con B se evitaría el SMS duplicado en una carrera, pero cambia el orden de la B3 |
| Q2 | Sin gestora y la inquilina ya con registro: ¿`skipped`? | A) `[NO_MANAGER, ALREADY_SENT]` · B) Solo `ALREADY_SENT` (como la B3) | **A**: es lo que pasa de verdad y el toast (E4-01) lo puede usar |
| Q3 | ¿Se mantiene `existsForIncident`? | A) Se sustituye por `findRecipientIds` · B) Se mantienen los dos | **A**: ya no lo usa nadie (E0-06 = sin código muerto) |

## 3. Fuera de alcance

- Reintentos de SMS (ADR-012).
- Cambiar la plantilla o el texto del SMS.
- Llamar a `sendPostVisit` desde `visit-status` (E1-02) o el fallback (E1-04).

## 4. Decisiones de clarificación acordadas

Carolina, 26/11 (opciones recomendadas): **Q1 = A**, **Q2 = A**, **Q3 = A**.

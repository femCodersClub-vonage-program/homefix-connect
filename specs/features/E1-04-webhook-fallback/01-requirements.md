# E1-04 · Fallback de `sessionDestroyed` — Requisitos

> Issue: #70 · Asignada a Caro-it (26/11) · Rama: `fix/E1-04-webhook-fallback` = `feat/E1-02-visit-status` + merge de `fix/E0-02-session-destroyed` (#79) · Depende de: E1-01, E1-02, E0-02
> Base: `docs/MVP_EXTENDED.md` §3.4, §4.3 · issue #70

## 1. Requisitos (issue #70)

| ID | Requisito | Estado |
| -- | --------- | ------ |
| E-01 | `sessionDestroyed` → `VideoSession = ENDED` siempre (si existe y no está ENDED) | Ya en E0-02 |
| E-02 | Visita `CONFIRMED` + sesión `ACTIVE` → **Visit COMPLETED + completedAt** + Incident VIDEO_COMPLETED + SMS | **Nuevo**: E0-02 solo tocaba la incidencia |
| E-03 | Visita `COMPLETED`/`CANCELLED` → solo cierra la sesión, sin SMS | Ya en E0-02 |
| E-04 | Sesión que nunca estuvo `ACTIVE` → solo cierra la sesión | Ya en E0-02 |
| E-05 | `reason = serverRotation` → no toca nada | Ya en E0-02 |
| E-06 | Tests de contrato + integración | Nuevo |

### Derivados

| ID | Requisito | Justificación |
| -- | --------- | ------------- |
| D-01 | Visita e incidencia en una transacción (`updateVisitOutcome` de E1-02) | Mismo resultado que «Finalizar visita» |
| D-02 | La sesión se cierra **al final** | Si falla guardar la visita (500), el reintento de Vonage la encuentra aún ACTIVE y completa la visita. Con E0-02 tal cual, el reintento veía ENDED y la visita no se completaba nunca |
| D-03 | Los SMS no se duplican si la técnica ya había finalizado | Visita ya COMPLETED → sin SMS; y E4-02 por destinataria |

## 2. Preguntas de clarificación

| # | Pregunta | Opciones | Propuesta |
| - | -------- | -------- | --------- |
| Q1 | ¿Cómo convive con E0-02 (#79, sin mergear)? | A) Rama sobre E1-02 + merge de E0-02 · B) Esperar a que se mergee #79 | **A**: el PR mostrará los commits de E0-02 hasta que entre #79; después se actualiza con `main` y desaparecen |
| Q2 | Orden: ¿cerrar la sesión primero (E0-02) o al final? | A) Al final · B) Primero | **A** (D-02) |

## 3. Decisiones de clarificación acordadas

Carolina, 26/11 (opciones recomendadas): **Q1 = A**, **Q2 = A**.

# I1 · E2E en local con ngrok — Plan

> Spec: [`02-specification.md`](./02-specification.md) · Issue: #23 · Rama: `test/I1-e2e` · Estado: borrador, pendiente de aprobación

## 1. Ficheros afectados

| Etiqueta   | Fichero | Qué y por qué |
| ---------- | ------- | ------------- |
| `[NEW]`    | `specs/features/I1-e2e/01…04` | Requisitos, spec, plan y validación con evidencias |
| `[MODIFY]` | `docs/LOCAL_SETUP.md` | Nueva §14 «Prueba E2E con Vonage real (I1)» (Q5) |

Sin cambios de código, `openapi.yaml`, `schema.prisma`, dependencias ni CI (Q9).

## 2. Requisitos previos (bloquean la ejecución, no la guía)

| # | Qué | De dónde sale | Estado |
| - | --- | ------------- | ------ |
| P1 | Cuenta de Vonage decidida (Q2) | Sync del 25/11 | ⏳ |
| P2 | `VONAGE_MESSAGES_FROM`: remitente válido de esa cuenta | Panel de Vonage (*Numbers*) o mentora | ⏳ vacío |
| P3 | `VONAGE_SIGNATURE_SECRET`: *signature secret* de esa cuenta | Panel de Vonage (*Settings*) o mentora | ⏳ vacío |
| P4 | Saldo y, si la cuenta es de prueba, móviles de destino verificados | Panel de Vonage | ⏳ |
| P5 | ngrok instalado y con sesión (`ngrok config add-authtoken …`) | ngrok.com | ⏳ por comprobar |
| P6 | Dos móviles reales para gestora e inquilina | Equipo | ⏳ |

## 3. Orden de ejecución

1. ✅ Requisitos (Q1–Q9 acordadas el 24/11).
2. ✅ Spec y este plan → aprobar.
3. Publicar Q1–Q9 y los requisitos previos en el #23.
4. Borrador de `LOCAL_SETUP.md` §14 (con los huecos de lo que solo se sabe al probar).
5. Conseguir P1–P6.
6. Ejecución real siguiendo §14; capturar evidencias (logs, consola de ngrok, estados en BD, SMS).
7. Corregir §14 con lo aprendido y rellenar `04-validation.md`.
8. Revisar CA-8 (nada sensible en el diff) → PR con `Closes #23`.

## 4. Riesgos

| Riesgo | Mitigación |
| ------ | ---------- |
| La firma de los callbacks de Video no coincide con la X3 | Q4: documentar + issue; preguntarlo en la sesión con Vonage |
| La URL de ngrok cambia al reiniciar | Dejar ngrok abierto toda la prueba; si cambia, actualizar el panel |
| Cuenta de prueba solo envía a números verificados | P4 |
| `sessionDestroyed` tarda ~1 min o no llega | Esperar 2 min; revisar `http://127.0.0.1:4040` |

# Definición del MVP — Homefix Connect

> **Alcance mínimo demostrable**: una **visita** ya asignada → inquilina y técnica
> entran a una **videollamada 1-a-1** → al colgar se envían **2 SMS** (gestora e
> inquilina) notificando que la visita se realizó.

---

## 1. Glosario

Los nombres de modelo (`Visit`, `VideoSession`…) y los valores de estado son los
de [`backend/prisma/schema.prisma`](../backend/prisma/schema.prisma). Si este
documento y el schema discrepan, **manda el schema**.

| Término | Modelo | Significado |
|---|---|---|
| **Incidencia** | `Incident` | Avería reportada. El MVP **no** la crea: ya existe |
| **Visita** | `Visit` | Cita (virtual o presencial) asociada a la incidencia. En este MVP es la videollamada |
| **Sesión de video** | `VideoSession` | Sala de Vonage asociada a la visita |
| **Notificación** | `Notification` | Registro de un SMS enviado y su estado de entrega |

> No existe el término «cita» ni el modelo `Appointment`: se dice **visita**.

---

## 2. Roles

| Rol | Enum | Quién es |
|---|---|---|
| **Inquilina** | `TENANT` | Reporta la avería, entra a la llamada y recibe SMS |
| **Técnica** | `TECHNICIAN` | Evalúa la avería en la llamada |
| **Gestora** | `MANAGER` | Consulta el estado y recibe SMS |

---

## 3. Contexto inicial (precondiciones)

La incidencia **ya existe** en el sistema con:

- Estado: `VISIT_ASSIGNED`
- Visita: `CONFIRMED`, con técnica asignada y fecha/hora programada
- Sesión de video: `PENDING` y **sin `vonageSessionId`** — la sesión de Vonage
  la crea el backend al primer acceso (tarea **A1**), no forma parte del seed
- Usuarios: inquilina (reporter), técnica y gestora

Esto es exactamente lo que deja `pnpm db:seed` (ver IDs fijos en
[`backend/AGENTS.md`](../backend/AGENTS.md)).

---

## 4. Escenarios Gherkin

### Escenario 1: la inquilina entra a la videollamada

```gherkin
Dado una incidencia con estado "VISIT_ASSIGNED" y visita "CONFIRMED"
Y la inquilina está autenticada en la aplicación
Y la sesión de video está en estado "PENDING"
Cuando la inquilina pulsa "Entrar a la videollamada"
Entonces el backend genera un token Vonage Video para el rol "TENANT"
Y el frontend inicializa el SDK Vonage Video con ese token
Y la inquilina ve su vídeo local y el estado "Conectando..."
Y la sesión de video pasa a estado "ACTIVE"
```

### Escenario 2: la técnica entra a la videollamada

```gherkin
Dado una incidencia con estado "VISIT_ASSIGNED" y visita "CONFIRMED"
Y la técnica asignada está autenticada en la aplicación
Y la sesión de video está en estado "ACTIVE" (la inquilina ya está conectada)
Cuando la técnica pulsa "Entrar a la videollamada"
Entonces el backend genera un token Vonage Video para el rol "TECHNICIAN"
Y el frontend inicializa el SDK Vonage Video con ese token
Y la técnica ve su vídeo local y el vídeo remoto de la inquilina
Y la inquilina ve el vídeo remoto de la técnica
Y ambas tienen audio y vídeo bidireccional
```

### Escenario 3: fin de la videollamada → 2 SMS

```gherkin
Dado una videollamada activa entre inquilina y técnica
Y la sesión de video está en estado "ACTIVE"
Cuando la videollamada termina (cuelgan o se cierra la sesión)
Entonces Vonage Video envía el webhook "session.end" al backend
Y el backend actualiza la sesión de video a "ENDED"
Y el backend actualiza la incidencia a "VIDEO_COMPLETED"
Y el backend envía 2 SMS vía Vonage Messages API:
  | Destinataria | Mensaje                                                                                                  |
  | Gestora      | "Visita realizada para la incidencia «{titulo}» por {tecnica}. Cuando el informe esté listo te notificaremos." |
  | Inquilina    | "Visita realizada para la incidencia «{titulo}» por {tecnica}. Cuando el informe esté listo te notificaremos." |
Y se crean 2 notificaciones en estado "QUEUED" con su providerMessageId
Y Vonage Messages envía webhooks "message.status" (submitted → delivered)
Y el backend actualiza las notificaciones a "SUBMITTED" y luego a "DELIVERED"
```

### Escenario 4: el frontend avisa de que la visita terminó

```gherkin
Dado que la videollamada ha finalizado y los SMS se han enviado
Cuando el frontend detecta que la incidencia pasó a "VIDEO_COMPLETED"
Entonces muestra un aviso: "Visita finalizada. Notificaciones enviadas a gestora e inquilina."
Y el botón "Entrar a la videollamada" queda deshabilitado con el texto "Visita realizada"
```

---

## 5. Fuera de alcance (no MVP)

| Funcionalidad | Motivo |
|---|---|
| Crear incidencias | Ya existe en las precondiciones |
| Proponer o confirmar visitas | Ya existe en las precondiciones |
| Autenticación real (login, JWT) | Cabeceras simuladas `X-User-Id` + `X-User-Role` |
| Dashboard de técnica o listado de incidencias | Solo vista detalle de una incidencia |
| Registro de diagnóstico por la técnica | Post-MVP |
| Agendar reparación presencial | Post-MVP |
| Grabación de videollamadas | Post-MVP |
| RCS / WhatsApp / Voice API | Solo SMS |
| Multi-propiedad, RBAC completo | Una sola gestora |

---

## 6. APIs de Vonage utilizadas

| API | Qué usamos | Para qué en el MVP |
|---|---|---|
| **Vonage Video** | Server SDK (crear sesión, generar tokens) + webhook `session.end` + Web SDK (WebRTC 1-a-1) | Videollamada inquilina ↔ técnica |
| **Vonage Messages** | Server SDK (enviar SMS) + webhook `message.status` | 2 SMS al terminar y seguimiento de entrega en BD |

> Los paths, payloads y cabeceras concretas viven en `backend/openapi.yaml`
> (tarea **T1**). Este documento no los fija.

---

## 7. Criterios de aceptación del MVP

- [ ] La inquilina puede entrar a la videollamada desde el detalle de la incidencia
- [ ] La técnica puede entrar a la misma videollamada
- [ ] Ambas se ven y se oyen (WebRTC 1-a-1 funcional)
- [ ] Al colgar se envían 2 SMS reales (Vonage Messages)
- [ ] Los SMS llegan a gestora e inquilina (números de prueba)
- [ ] Los webhooks de entrega actualizan el estado en la base de datos
- [ ] El frontend confirma visualmente que la visita terminó
- [ ] El README explica cómo configurar, ejecutar y probar sin publicar secretos

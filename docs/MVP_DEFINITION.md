# Definición del MVP — Homefix Connect

> **Alcance mínimo demostrable**: Incidencia ya creada con visita asignada → usuario entra a videollamada 1-a-1 → al finalizar se envía SMS a gestor/propietario + inquilino notificando que la visita se realizó.

---

## Contexto Inicial (Precondiciones)

La incidencia **ya existe** en el sistema con:
- Estado: `VISITA_ASIGNADA`
- Cita: `CONFIRMED` con técnico asignado, fecha/hora programada
- Sesión de video: `PENDING` (Vonage sessionId creado, tokens no generados)
- Usuarios: Inquilino (reporter), Técnico, Gestor/Propietario

---

## Escenarios Gherkin

### Escenario 1: Inquilino entra a la videollamada

```gherkin
Dado una incidencia con estado "VISITA_ASIGNADA" y cita "CONFIRMED"
Y el inquilino está autenticado en la aplicación
Y la sesión de video está en estado "PENDING"
Cuando el inquilino pulsa "Entrar a la videollamada"
Entonces el backend genera un token Vonage Video para rol "TENANT"
Y el frontend inicializa el SDK Vonage Video con ese token
Y el inquilino ve su vídeo local y estado "Conectando..."
Y la sesión de video pasa a estado "ACTIVE"
```

### Escenario 2: Técnico entra a la videollamada

```gherkin
Dado una incidencia con estado "VISITA_ASIGNADA" y cita "CONFIRMED"
Y el técnico asignado está autenticado en la aplicación
Y la sesión de video está en estado "ACTIVE" (inquilino ya conectado)
Cuando el técnico pulsa "Entrar a la videollamada"
Entonces el backend genera un token Vonage Video para rol "TECHNICIAN"
Y el frontend inicializa el SDK Vonage Video con ese token
Y el técnico ve su vídeo local y el vídeo remoto del inquilino
Y el inquilino ve el vídeo remoto del técnico
Y ambos tienen audio y vídeo bidireccional
```

### Escenario 3: Finalización de la videollamada → Envío de SMS

```gherkin
Dado una videollamada activa entre inquilino y técnico
Y la sesión de video está en estado "ACTIVE"
Cuando la videollamada termina (cuelgan o se cierra la sesión)
Entonces Vonage Video API envía webhook "session.end" al backend
Y el backend actualiza la sesión de video a estado "ENDED"
Y el backend actualiza la incidencia a estado "VIDEO_COMPLETED"
Y el backend envía 2 SMS vía Vonage Messages API:
  | Destinatario          | Mensaje                                                                      |
  | Gestor/Propietario    | "Visita realizada para incidencia '{titulo}' por {tecnico}. Cuando el informe esté listo te notificaremos." |
  | Inquilino             | "Visita realizada para incidencia '{titulo}' por {tecnico}. Cuando el informe esté listo te notificaremos." |
Y se crean 2 notificaciones en estado "QUEUED" con providerMessageId
Y Vonage Messages API envía webhooks "message.status" (submitted → delivered)
Y el backend actualiza notificaciones a "SENT" y luego "DELIVERED"
```

### Escenario 4: Frontend notifica fin de visita al usuario

```gherkin
Dado que la videollamada ha finalizado y los SMS se han enviado
Cuando el frontend detecta que la incidencia pasó a "VIDEO_COMPLETED"
Entonces muestra un toast: "Visita finalizada. Notificaciones enviadas a gestor e inquilino."
Y el botón "Entrar a la videollamada" pasa a estado deshabilitado con texto "Visita realizada"
```

---

## Fuera de Alcance (No MVP)

| Funcionalidad | Motivo |
|---------------|--------|
| Crear incidencias | Ya existe en precondiciones |
| Proponer/confirmar citas | Ya existe en precondiciones |
| Autenticación real (login, JWT) | Headers simulados `X-User-Id` + `X-User-Role` |
| Dashboard técnico / lista de incidencias | Solo vista detalle de una incidencia |
| Registro de diagnóstico por técnico | Post-MVP |
| Agendar reparación presencial | Post-MVP |
| Grabación de videollamadas | Post-MVP |
| RCS / WhatsApp / Voice API | Solo SMS |
| Multi-propiedad, RBAC completo | Un solo gestor/propietario |

---

## APIs Vonage Utilizadas (Overview)

| API | Qué Usamos | Para Qué en el MVP |
|-----|------------|-------------------|
| **Vonage Video API** | • Server SDK (Node) → crear sesión, generar tokens<br>• Webhooks → `session.end`<br>• Client SDK (Web) → WebRTC 1-a-1 en navegador | Videollamada inquilino ↔ técnico: backend genera tokens cortos, frontend conecta con SDK, webhook notifica fin de sesión |
| **Vonage Messages API** | • Server SDK (Node) → enviar SMS<br>• Webhooks → `message.status` (delivery receipts) | Al acabar la videollamada: 2 SMS automáticos (gestor + inquilino) con plantilla "Visita realizada...", tracking de entrega en BD |

> **Detalle de implementación** (SDKs, payloads, firmas webhooks, reintentos) → se define en fase de definición (`API_CONTRACTS.md`, `ARCHITECTURE.md`) por el equipo.

---

## Criterios de Aceptación del MVP

- [ ] Inquilino puede entrar a videollamada desde detalle de incidencia
- [ ] Técnico puede entrar a la misma videollamada
- [ ] Ambos se ven y oyen (WebRTC 1-a-1 funcional)
- [ ] Al colgar, se disparan 2 SMS reales (Vonage Messages API)
- [ ] Los SMS llegan a gestor/propietario e inquilino (números de prueba)
- [ ] Webhooks de delivery actualizan estado en BD
- [ ] Frontend muestra confirmación visual de "Visita finalizada"
- [ ] README explica cómo configurar, ejecutar y probar sin publicar secretos
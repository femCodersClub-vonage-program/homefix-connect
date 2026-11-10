HOMEFIX CONNECT

Definición del MVP y casos de uso

Mentora: Mariellys Soto

Documento de trabajo para acordar alcance, tecnologías e integraciones
de Vonage

Duración total del proyecto: 6 semanas (4 semanas restantes)

# 1. Visión del producto

Homefix Connect es una aplicación web para simplificar la comunicación y
coordinación de reparaciones en viviendas de alquiler. Permite registrar
una avería, coordinar una visita virtual con un técnico, realizar una
videollamada para evaluar el problema y comunicar el diagnóstico y los
siguientes pasos.

## Problema que aborda

La coordinación de una reparación puede requerir varios intercambios
entre la persona que reporta la avería y el técnico. La información
puede quedar dispersa y las personas implicadas pueden no conocer el
estado de la incidencia o la fecha de la visita.

## Objetivo del MVP

Disponer de un flujo funcional y demostrable que cubra el registro de
una incidencia, la programación de una visita virtual, la videollamada,
el registro de un diagnóstico y el envío de notificaciones sobre los
principales cambios.

## Perfiles implicados

-   Inquilina: Registra la avería, consulta su estado y participa en la
    visita virtual.

-   Técnico: Revisa la incidencia, participa en la visita, registra el
    diagnóstico y propone los siguientes pasos.

-   Propietaria / persona gestora: Puede consultar el estado y recibir
    avisos relevantes, según el alcance acordado.

# 2. Flujo principal del MVP

# 3. Casos de uso

## CU-01 · Registrar una avería

Descripción: La inquilina crea una incidencia e introduce una
descripción del problema, vivienda y prioridad. Puede adjuntar una foto
si se incluye en el alcance.

Resultado esperado: Incidencia creada con identificador y estado
inicial.

## CU-02 · Consultar el estado de una incidencia

Descripción: La persona usuaria consulta los datos principales, el
estado actual y los cambios registrados.

Resultado esperado: Información de seguimiento visible en la aplicación.

## CU-03 · Proponer y confirmar una visita virtual

Descripción: Se propone una fecha y hora para hablar con el técnico. La
cita queda pendiente hasta su confirmación.

Resultado esperado: Cita confirmada o pendiente de confirmación.

## CU-04 · Notificar eventos de la incidencia

Descripción: El sistema envía avisos cuando se crea la incidencia, se
confirma una cita o se registra el diagnóstico.

Resultado esperado: Notificación enviada y, si la integración lo
permite, estado de entrega actualizado.

## CU-05 · Realizar una videollamada

Descripción: Los participantes autorizados entran en una sesión de vídeo
desde el navegador para observar la avería.

Resultado esperado: Visita virtual realizada.

## CU-06 · Registrar el diagnóstico

Descripción: El técnico añade observaciones e indica si la avería puede
resolverse de forma remota o requiere una visita presencial.

Resultado esperado: Diagnóstico guardado y siguiente acción registrada.

## CU-07 · Agendar una reparación presencial

Descripción: Si hace falta una intervención física, se registra una
propuesta de fecha o una cita confirmada.

Resultado esperado: Reparación presencial pendiente de realizar.

# 4. Alcance propuesto para seis semanas

El alcance definitivo se acuerda en equipo. La siguiente tabla separa el
flujo principal de las ampliaciones posibles.

# 5. Tecnologías a valorar

Las siguientes opciones son una base para la decisión del equipo; no se
consideran cerradas hasta escogerlas.

# 6. Integraciones de Vonage para escoger

El equipo debe decidir qué integraciones entran en la entrega y qué SDKs
se utilizarán.

## A. Mensajería --- Vonage Messages API

-   Enviar SMS cuando se crea una incidencia o se confirma una cita.

-   Recibir webhooks de estado y registrar los cambios del mensaje.

-   Mostrar el estado de envío/entrega en la aplicación, cuando la
    información esté disponible.

-   Valorar RCS como canal adicional si el tiempo y la configuración de
    la cuenta lo permiten.

## B. Videollamadas --- Vonage Video API

-   Crear una sesión de vídeo asociada a una cita.

-   Generar tokens desde el backend para participantes autorizados.

-   Integrar el SDK web para publicar y recibir audio y vídeo.

-   Registrar el resultado de la visita en la incidencia.

## C. Telefonía --- Vonage Voice API (opcional / fase posterior)

Permitir que una persona reporte una avería mediante una llamada o que
el sistema realice llamadas automatizadas. Esta opción añade gestión de
llamadas y webhooks propios, por lo que su inclusión debe valorarse
frente al alcance de seis semanas.

## D. SDKs y puntos técnicos que deben decidirse

-   SDK de servidor de Vonage para el lenguaje elegido o llamadas HTTP
    directas a las APIs.

-   SDK de cliente web de Vonage Video para React.

-   Autenticación y gestión segura de credenciales en el backend.

-   Webhooks de estado de mensajes y estrategia para probarlos
    localmente.

-   Disponibilidad, requisitos de cuenta y coste de los canales que se
    seleccionen.

# 7. Modelo de datos inicial

# 8. Endpoints iniciales a considerar

# 9. Plan de trabajo orientativo

-   Semana 1: Acordar alcance, configurar repositorio y entorno,
    comprobar credenciales y prototipos mínimos de las APIs.

-   Semana 2: Implementar modelo de datos, incidencias, citas y primeras
    pantallas.

-   Semana 3: Integrar envío de SMS, persistencia de resultados y
    webhooks de estado.

-   Semana 4: Integrar sesiones, tokens y SDK web de videollamadas.

-   Semana 5: Conectar el flujo completo: incidencia, cita, vídeo,
    diagnóstico y notificación.

-   Semana 6: Pruebas de integración, manejo de errores, documentación y
    demostración.

# 10. Criterios de aceptación del MVP

-   Se puede crear y consultar una incidencia desde la web.

-   Se puede proponer y confirmar una visita virtual.

-   Se envía un SMS real mediante Vonage Messages API.

-   El backend recibe un webhook de estado y registra la actualización.

-   Dos participantes pueden conectarse a una videollamada desde el
    navegador.

-   El backend controla la creación de sesiones y la generación de
    tokens de vídeo.

-   El técnico puede guardar un diagnóstico y el siguiente paso.

-   El README explica cómo configurar, ejecutar y probar el proyecto sin
    publicar secretos.

# 11. Seguridad y aspectos técnicos

-   Las credenciales y claves privadas de Vonage se guardan en variables
    de entorno y nunca se suben a Git.

-   Los tokens de vídeo se generan en el backend y solo se entregan a
    participantes autorizados.

-   Los webhooks deben validarse según las capacidades de seguridad
    disponibles en Vonage.

-   Los datos personales y teléfonos se limitan a lo necesario para la
    demo y el flujo funcional.

-   No se grabarán videollamadas en el alcance inicial.

-   Los envíos SMS reales pueden tener coste y requieren configuración
    de cuenta, remitente y destinatarios permitidos.

# 12. Decisiones pendientes del equipo

-   ¿El MVP incluye SMS únicamente o también RCS?

-   ¿Se incluye Vonage Voice API o queda fuera del MVP?

-   ¿Se usa el SDK de servidor de Vonage o llamadas HTTP directas?

-   ¿Qué SDK web y enfoque de integración de Video API se adoptan?

-   ¿La demo usa usuarios de prueba o incluye autenticación real?

-   ¿La base de datos será PostgreSQL o SQLite?

-   ¿Qué eventos concretos generan SMS y quién los recibe?

-   ¿Se incluye una cita presencial básica o solo se registra como
    siguiente paso?

Documento de definición inicial · Homefix Connect

| OBJETIVO Definir una primera versión funcional para coordinar
  incidencias de mantenimiento entre una inquilina y un técnico, con
  especial atención a la comunicación mediante mensajería y
  videollamadas. \|

| --- \|

| 1. Reporte \| La inquilina registra una incidencia con título,
  descripción, vivienda y prioridad. \|

| --- \| --- \|

| 2. Programación \| Se propone y confirma una fecha y hora para una
  visita virtual. \|

| 3. Notificación \| Las personas implicadas reciben la información
  relevante de la cita. \|

| 4. Videollamada \| La inquilina y el técnico acceden a una sala de
  vídeo desde el navegador. \|

| 5. Diagnóstico \| El técnico registra observaciones e indica si hace
  falta una reparación presencial. \|

| 6. Seguimiento \| La incidencia se actualiza y se comunica el
  resultado y el siguiente paso. \|

| Área \| Incluido en el MVP \| Ampliaciones posibles \|

| --- \| --- \| --- \|

| Incidencias \| Crear, consultar y actualizar estado \| Adjuntos
  múltiples, clasificación automática \|

| Citas \| Proponer y confirmar visita virtual \| Sincronización con
  calendarios externos \|

| Mensajería \| SMS y recepción de estados mediante webhook \| RCS,
  WhatsApp, respuestas entrantes \|

| Vídeo \| Videollamada web entre dos participantes \| Grabación,
  transcripción, salas avanzadas \|

| Diagnóstico \| Observaciones y siguiente paso \| Presupuestos
  detallados, pagos y facturación \|

| Reparación presencial \| Registrar una cita o siguiente acción \|
  Asignación automática de técnicos \|

| Telefonía \| Fuera del alcance inicial \| Registro de averías mediante
  llamadas de voz \|

| Componente \| Tecnología / alternativa \| Uso \|

| --- \| --- \| --- \|

| Backend \| Node.js + TypeScript + Express \| API REST, reglas de
  negocio e integraciones con Vonage. \|

| Frontend \| React + TypeScript + Vite \| Interfaz para incidencias,
  citas y videollamada. \|

| Base de datos \| PostgreSQL + Prisma / SQLite + Prisma \| Persistencia
  de incidencias, citas, diagnósticos y notificaciones. \|

| Mensajería \| Vonage Messages API \| Envío de SMS y webhooks de
  estado; RCS se puede valorar aparte. \|

| Videollamada \| Vonage Video API + SDK web \| Sesiones, tokens y
  conexión de participantes desde el navegador. \|

| Pruebas \| Vitest o Jest; Postman \| Pruebas de lógica, endpoints e
  integración. \|

| Webhooks locales \| ngrok u otra herramienta equivalente \| Permitir
  que Vonage alcance el backend durante desarrollo local. \|

| Repositorio y CI \| GitHub + GitHub Actions \| Issues, pull requests,
  revisión de código y comprobaciones automáticas. \|

| Entidad \| Datos principales \|

| --- \| --- \|

| User \| Nombre, email, teléfono, rol (inquilina, técnico,
  propietaria/gestora). \|

| Incident \| Descripción, prioridad, estado, vivienda, persona que
  reporta y fechas. \|

| Appointment \| Incidencia, tipo de visita, fecha/hora, participantes y
  estado. \|

| Diagnosis \| Observaciones, resolución remota o presencial y siguiente
  paso. \|

| Notification \| Destinatario, canal, identificador del proveedor,
  estado y marcas de tiempo. \|

| VideoSession \| Cita asociada, identificador de sesión y datos mínimos
  necesarios para gestionar el acceso. \|

| Endpoint \| Responsabilidad \|

| --- \| --- \|

| POST /api/incidents \| Crear una incidencia. \|

| GET /api/incidents \| Listar incidencias. \|

| GET /api/incidents/:id \| Consultar el detalle de una incidencia. \|

| POST /api/incidents/:id/appointments \| Proponer una visita. \|

| PATCH /api/appointments/:id \| Confirmar o actualizar una cita. \|

| POST /api/appointments/:id/video-session \| Crear o recuperar la
  sesión de vídeo de una cita. \|

| POST /api/appointments/:id/video-token \| Emitir un token a un
  participante autorizado. \|

| POST /api/notifications \| Solicitar el envío de una notificación. \|

| POST /api/webhooks/message-status \| Recibir actualizaciones de estado
  de mensajes. \|

# Payloads de Vonage Video (Session Monitoring)

Ejemplos de los callbacks que Vonage envía al webhook `POST /api/webhooks/video-events` (A4).
Los usan los tests de contrato e integración de la A5 (#11).

- Fuente: https://developer.vonage.com/en/video/guides/session-monitoring
  (secciones «Monitoring when sessions start and stop», «Monitoring connection activity» y «Monitoring streams»).
- Campos y estructura según esa página. Los valores (ids, timestamps) son de ejemplo, no de una cuenta real.
- `reason` de `sessionDestroyed` según la doc: `clientDisconnected`, `forceDisconnected`, `mediaIdle`, `serverRotation`.
- Solo `sessionDestroyed` cierra la visita (A4, Q1); el resto de eventos se responden con `200 ignored`.

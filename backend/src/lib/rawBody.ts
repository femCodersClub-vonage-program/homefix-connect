import type { IncomingMessage, ServerResponse } from 'node:http';

declare module 'http' {
  interface IncomingMessage {
    /** Cuerpo tal cual llegó, antes de parsear el JSON. */
    rawBody?: Buffer;
  }
}

/**
 * Opción `verify` de `express.json()`: guarda los bytes originales del cuerpo.
 * La firma de los webhooks de Vonage se calcula sobre esos bytes, y el JSON
 * re-serializado no tiene por qué coincidir (espacios, orden de claves).
 */
export function captureRawBody(
  req: IncomingMessage,
  _res: ServerResponse,
  buf: Buffer,
): void {
  req.rawBody = buf;
}

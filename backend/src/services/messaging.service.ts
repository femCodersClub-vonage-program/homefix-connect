import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { SMS } from '@vonage/messages';
import { Vonage } from '@vonage/server-sdk';

import { logger } from '../lib/logger.js';
import {
  VonageAuthError,
  VonageNetworkError,
  VonageValidationError,
} from '../lib/vonage-errors.js';

export interface MessagingService {
  sendSms(to: string, body: string): Promise<{ providerMessageId: string }>;
}

/**
 * Stub en memoria: no envía SMS reales. La implementación con Vonage llega
 * en B1/B2 y debe cumplir esta misma interface.
 */
export class InMemoryMessagingService implements MessagingService {
  private counter = 0;

  async sendSms(
    _to: string,
    _body: string,
  ): Promise<{ providerMessageId: string }> {
    this.counter += 1;
    return { providerMessageId: `stub-msg-${this.counter}` };
  }
}

// B1 · Cliente real de Vonage Messages (SMS).
// Spec: specs/features/B1-messages-client/02-specification.md

/** Lo mínimo que usamos del SDK (`vonage.messages`). Se inyecta para mockearlo en tests (Q3). */
export type VonageMessagesSdk = {
  send(message: SMS): Promise<{ messageUUID?: string }>;
};

export type VonageMessagesClientOptions = {
  client: VonageMessagesSdk;
  from: string;
};

// E.164 con + (Q2). Vonage lo quiere sin +, se quita antes de enviar.
const E164_WITH_PLUS = /^\+[1-9]\d{6,14}$/;

/** +34600000001 → +34******001. Los teléfonos nunca van completos a los logs. */
function maskPhone(phone: string): string {
  if (phone.length <= 6) return '***';
  return `${phone.slice(0, 3)}${'*'.repeat(phone.length - 6)}${phone.slice(-3)}`;
}

function httpStatusOf(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const response = (error as { response?: { status?: unknown } }).response;
  return typeof response?.status === 'number' ? response.status : undefined;
}

/**
 * Traduce el error del SDK (VetchError: status en error.response.status) a los
 * errores tipados de B1 (Q4 + ampliación del 20/11):
 * 401/403 → auth · resto de 4xx → validación (no reintentable) ·
 * 429, 5xx, red, timeout y cualquier otro → red (reintentable, lo decide B3).
 */
function mapSdkError(error: unknown): Error {
  // Los nuestros (p. ej. credenciales que faltan) pasan tal cual.
  if (
    error instanceof VonageAuthError ||
    error instanceof VonageValidationError ||
    error instanceof VonageNetworkError
  ) {
    return error;
  }
  const status = httpStatusOf(error);
  const message =
    status !== undefined
      ? `Vonage Messages respondió ${status}`
      : 'No se pudo contactar con Vonage Messages';

  if (status === 401 || status === 403) return new VonageAuthError(message);
  if (status !== undefined && status >= 400 && status < 500 && status !== 429) {
    return new VonageValidationError(message);
  }
  return new VonageNetworkError(message);
}

export class VonageMessagesClient implements MessagingService {
  private readonly client: VonageMessagesSdk;
  private readonly from: string;

  constructor(options: VonageMessagesClientOptions) {
    this.client = options.client;
    this.from = options.from;
  }

  async sendSms(
    to: string,
    body: string,
  ): Promise<{ providerMessageId: string }> {
    if (!E164_WITH_PLUS.test(to)) {
      throw new VonageValidationError(
        'El número de destino no está en formato E.164 (+34600000000)',
      );
    }
    if (body.trim() === '') {
      throw new VonageValidationError('El texto del SMS está vacío');
    }

    const maskedTo = maskPhone(to);
    const sms = new SMS(body, to.slice(1), this.from);

    let messageUUID: string | undefined;
    try {
      ({ messageUUID } = await this.client.send(sms));
    } catch (error) {
      const mapped = mapSdkError(error);
      logger.error(
        { to: maskedTo, status: httpStatusOf(error), error: mapped.name },
        'sms send failed',
      );
      throw mapped;
    }

    if (!messageUUID) {
      logger.error({ to: maskedTo }, 'sms send failed: no messageUUID');
      throw new VonageNetworkError('Vonage Messages no devolvió el id del mensaje');
    }

    // Sin el texto del SMS: solo su longitud.
    logger.info(
      { to: maskedTo, providerMessageId: messageUUID, bodyLength: body.length },
      'sms sent',
    );
    return { providerMessageId: messageUUID };
  }
}

export type VonageMessagesConfig = {
  applicationId: string | undefined;
  privateKeyPath: string | undefined;
  from: string | undefined;
};

/**
 * Crea el cliente real a partir de la config (Q1: JWT, misma app que A2).
 * Sin credenciales o sin remitente la app arranca igual y solo falla sendSms
 * con VonageAuthError (Q5). El SDK se instancia en la primera llamada.
 * No se conecta en app.ts: lo hace B2/B3 (Q6).
 */
export function createVonageMessagesClient(
  config: VonageMessagesConfig,
): MessagingService {
  const { applicationId, privateKeyPath, from } = config;

  let sdkClient: VonageMessagesSdk | undefined;

  function getClient(): VonageMessagesSdk {
    if (!applicationId || !privateKeyPath) {
      throw new VonageAuthError('Credenciales de Vonage Messages no configuradas');
    }
    if (!sdkClient) {
      // Igual que A2: si la ruta no existe, el SDK usaría el texto de la ruta como clave.
      const keyPath = resolve(privateKeyPath);
      if (!existsSync(keyPath)) {
        throw new VonageAuthError(
          `No se encuentra el private.key de Vonage en ${keyPath}`,
        );
      }
      const messages = new Vonage({ applicationId, privateKey: keyPath })
        .messages;
      sdkClient = { send: (message) => messages.send(message) };
    }
    return sdkClient;
  }

  if (!from?.trim()) {
    return {
      sendSms: () =>
        Promise.reject(
          new VonageAuthError('Falta VONAGE_MESSAGES_FROM (remitente del SMS)'),
        ),
    };
  }

  // Adaptador perezoso: el error de credenciales sale al llamar, no al crear.
  const lazyClient: VonageMessagesSdk = {
    send: (message) => {
      try {
        return getClient().send(message);
      } catch (error) {
        return Promise.reject(error);
      }
    },
  };

  return new VonageMessagesClient({ client: lazyClient, from });
}

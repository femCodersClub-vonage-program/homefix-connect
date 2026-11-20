import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  VonageAuthError,
  VonageNetworkError,
  VonageValidationError,
} from '../lib/vonage-errors.js';
import {
  createVonageMessagesClient,
  type VonageMessagesSdk,
  VonageMessagesClient,
} from '../services/messaging.service.js';

// B1 · VonageMessagesClient — tests unitarios (fase roja).
// Spec: specs/features/B1-messages-client/02-specification.md (CA-1 a CA-9).
// El cliente del SDK está mockeado: sin red, sin credenciales, sin BD (Q3).

const { logInfo, logError } = vi.hoisted(() => ({
  logInfo: vi.fn(),
  logError: vi.fn(),
}));

vi.mock('../lib/logger.js', () => ({
  logger: { info: logInfo, warn: vi.fn(), error: logError, debug: vi.fn() },
}));

const TO = '+34600000001';
const TO_SIN_MAS = '34600000001';
const FROM = 'HomeFix';
const BODY = 'Tu visita ha terminado. Diagnóstico disponible en la app.';

// Error con la forma que lanza el SDK (VetchError de @vonage/vetch):
// el status HTTP va en error.response.status.
function httpError(status: number) {
  return Object.assign(
    new Error(`Request failed with status code ${status}`),
    { response: { status } },
  );
}

function makeSdk(overrides: Partial<VonageMessagesSdk> = {}) {
  return {
    send: vi.fn().mockResolvedValue({ messageUUID: 'msg-123' }),
    ...overrides,
  };
}

function makeClient(sdk = makeSdk()) {
  return new VonageMessagesClient({ client: sdk, from: FROM });
}

beforeEach(() => {
  logInfo.mockClear();
  logError.mockClear();
});

describe('VonageMessagesClient.sendSms', () => {
  it('CA-1 · envía el SMS (número sin +, remitente de config) y devuelve el id del mensaje', async () => {
    const sdk = makeSdk();
    const client = makeClient(sdk);

    const result = await client.sendSms(TO, BODY);

    expect(result).toEqual({ providerMessageId: 'msg-123' });
    expect(sdk.send).toHaveBeenCalledTimes(1);
    expect(sdk.send).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: 'sms',
        messageType: 'text',
        to: TO_SIN_MAS,
        from: FROM,
        text: BODY,
      }),
    );
  });

  it.each([
    ['sin +', TO_SIN_MAS],
    ['con espacios', '+34 600 000 001'],
    ['con letras', '+34abc000001'],
    ['vacío', ''],
  ])(
    'CA-2 · número %s → VonageValidationError sin llamar al SDK',
    async (_caso, to) => {
      const sdk = makeSdk();
      const client = makeClient(sdk);

      await expect(client.sendSms(to, BODY)).rejects.toBeInstanceOf(
        VonageValidationError,
      );
      expect(sdk.send).not.toHaveBeenCalled();
    },
  );

  it('CA-3 · body vacío → VonageValidationError sin llamar al SDK', async () => {
    const sdk = makeSdk();
    const client = makeClient(sdk);

    await expect(client.sendSms(TO, '')).rejects.toBeInstanceOf(
      VonageValidationError,
    );
    expect(sdk.send).not.toHaveBeenCalled();
  });

  it.each([401, 403])('CA-4 · Vonage responde %i → VonageAuthError', async (status) => {
    const client = makeClient(
      makeSdk({ send: vi.fn().mockRejectedValue(httpError(status)) }),
    );

    await expect(client.sendSms(TO, BODY)).rejects.toBeInstanceOf(
      VonageAuthError,
    );
  });

  it.each([400, 422])(
    'CA-5 · Vonage responde %i → VonageValidationError',
    async (status) => {
      const client = makeClient(
        makeSdk({ send: vi.fn().mockRejectedValue(httpError(status)) }),
      );

      await expect(client.sendSms(TO, BODY)).rejects.toBeInstanceOf(
        VonageValidationError,
      );
    },
  );

  it.each([404, 409, 413])(
    'CA-5 · resto de 4xx (%i) → VonageValidationError (ampliación Q4)',
    async (status) => {
      const client = makeClient(
        makeSdk({ send: vi.fn().mockRejectedValue(httpError(status)) }),
      );

      await expect(client.sendSms(TO, BODY)).rejects.toBeInstanceOf(
        VonageValidationError,
      );
    },
  );

  it.each([
    ['429', httpError(429)],
    ['500', httpError(500)],
    ['503', httpError(503)],
    ['error de red', new TypeError('fetch failed')],
    ['timeout', Object.assign(new Error('aborted'), { name: 'AbortError' })],
    ['error desconocido', 'algo raro'],
  ])('CA-6 · %s → VonageNetworkError', async (_caso, error) => {
    const client = makeClient(
      makeSdk({ send: vi.fn().mockRejectedValue(error) }),
    );

    await expect(client.sendSms(TO, BODY)).rejects.toBeInstanceOf(
      VonageNetworkError,
    );
  });

  it('CA-6 · respuesta OK pero sin messageUUID → VonageNetworkError', async () => {
    const client = makeClient(
      makeSdk({ send: vi.fn().mockResolvedValue({}) }),
    );

    await expect(client.sendSms(TO, BODY)).rejects.toBeInstanceOf(
      VonageNetworkError,
    );
  });

  it('CA-8 · los logs no llevan el body ni el teléfono completo', async () => {
    const okClient = makeClient();
    await okClient.sendSms(TO, BODY);

    const failClient = makeClient(
      makeSdk({ send: vi.fn().mockRejectedValue(httpError(500)) }),
    );
    await failClient.sendSms(TO, BODY).catch(() => undefined);

    const logged = JSON.stringify([
      ...logInfo.mock.calls,
      ...logError.mock.calls,
    ]);
    expect(logInfo).toHaveBeenCalled();
    expect(logError).toHaveBeenCalled();
    expect(logged).not.toContain(BODY);
    expect(logged).not.toContain(TO_SIN_MAS);
    expect(logged).toContain('001'); // teléfono enmascarado, p. ej. +34*****001
  });
});

describe('createVonageMessagesClient', () => {
  it.each([
    ['falta applicationId', { applicationId: undefined, privateKeyPath: './private.key', from: FROM }],
    ['falta privateKeyPath', { applicationId: 'app-id', privateKeyPath: undefined, from: FROM }],
    ['falta VONAGE_MESSAGES_FROM', { applicationId: 'app-id', privateKeyPath: './private.key', from: undefined }],
  ])(
    'CA-7 · %s: se crea sin error y sendSms lanza VonageAuthError',
    async (_caso, config) => {
      const client = createVonageMessagesClient(config);

      await expect(client.sendSms(TO, BODY)).rejects.toBeInstanceOf(
        VonageAuthError,
      );
    },
  );
});

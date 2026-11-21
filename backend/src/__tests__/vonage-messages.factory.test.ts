import { beforeEach, describe, expect, it, vi } from 'vitest';

// B1 · createVonageMessagesClient con configuración completa (review de Copilot en el #43).
// Se mockean el SDK y el sistema de archivos: sin red, sin credenciales reales.

const { vonageCtor, sendMock } = vi.hoisted(() => ({
  vonageCtor: vi.fn(),
  sendMock: vi.fn(),
}));

vi.mock('@vonage/server-sdk', () => ({
  Vonage: vi.fn(function (this: unknown, credentials: unknown) {
    vonageCtor(credentials);
    return { messages: { send: sendMock } };
  }),
}));

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return { ...actual, existsSync: vi.fn().mockReturnValue(true) };
});

vi.mock('../lib/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const { createVonageMessagesClient } = await import(
  '../services/messaging.service.js'
);

const CONFIG = {
  applicationId: 'app-id-test',
  privateKeyPath: './private.key',
  from: 'HomeFix',
};

beforeEach(() => {
  vonageCtor.mockClear();
  sendMock.mockReset();
});

describe('createVonageMessagesClient (configuración completa)', () => {
  it('no crea el SDK hasta el primer envío', () => {
    createVonageMessagesClient(CONFIG);

    expect(vonageCtor).not.toHaveBeenCalled();
  });

  it('crea el SDK con JWT en el primer envío, delega en messages.send y lo reutiliza', async () => {
    sendMock
      .mockResolvedValueOnce({ messageUUID: 'msg-1' })
      .mockResolvedValueOnce({ messageUUID: 'msg-2' });
    const client = createVonageMessagesClient(CONFIG);

    const first = await client.sendSms('+34600000001', 'Hola');
    const second = await client.sendSms('+34600000003', 'Hola otra vez');

    expect(first).toEqual({ providerMessageId: 'msg-1' });
    expect(second).toEqual({ providerMessageId: 'msg-2' });

    // JWT (Q1): applicationId + ruta absoluta del private.key. Se crea una sola vez.
    expect(vonageCtor).toHaveBeenCalledTimes(1);
    expect(vonageCtor).toHaveBeenCalledWith({
      applicationId: 'app-id-test',
      privateKey: expect.stringMatching(/private\.key$/),
    });

    expect(sendMock).toHaveBeenCalledTimes(2);
    expect(sendMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        channel: 'sms',
        to: '34600000001',
        from: 'HomeFix',
        text: 'Hola',
      }),
    );
  });
});

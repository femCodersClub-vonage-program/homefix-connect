import { describe, expect, it, vi } from 'vitest';

import {
  createVonageVideoService,
  type VonageVideoClient,
  VonageVideoService,
} from '../services/vonage-video.service.js';

// A2 · VonageVideoService — tests unitarios (fase roja).
// Spec: specs/features/A2-video-service/02-specification.md (CA-01 a CA-06).
// El cliente de Vonage está mockeado: sin red, sin credenciales, sin BD.

// Reloj fijo para comprobar expireTime / expiresAt sin fake timers.
const NOW_MS = 1_800_000_000_000;
const NOW_S = NOW_MS / 1000;
const ONE_HOUR_S = 3600;

function makeClient(overrides: Partial<VonageVideoClient> = {}) {
  const client = {
    createSession: vi.fn().mockResolvedValue({ sessionId: 'vonage-123' }),
    generateClientToken: vi.fn().mockReturnValue('tok-abc'),
    ...overrides,
  };
  return client;
}

function makeService(client = makeClient()) {
  return new VonageVideoService({ client, now: () => NOW_MS });
}

describe('VonageVideoService', () => {
  describe('createSession', () => {
    it('CA-01 · crea la sesión en Vonage (relayed) y devuelve su sessionId', async () => {
      const client = makeClient();
      const service = makeService(client);

      const result = await service.createSession('visit_demo');

      expect(result).toEqual({ sessionId: 'vonage-123' });
      expect(client.createSession).toHaveBeenCalledTimes(1);
      // En @vonage/video, MediaMode.RELAYED === 'enabled' (P2P). Por defecto el SDK usa ROUTED.
      expect(client.createSession).toHaveBeenCalledWith(
        expect.objectContaining({ mediaMode: 'enabled' }),
      );
    });

    it('CA-06 · propaga el error si el SDK falla', async () => {
      const client = makeClient({
        createSession: vi.fn().mockRejectedValue(new Error('Vonage caído')),
      });
      const service = makeService(client);

      await expect(service.createSession('visit_demo')).rejects.toThrow(
        'Vonage caído',
      );
    });
  });

  describe('generateToken', () => {
    it('CA-02 · devuelve el token con TTL de 1 h (expireTime en segundos)', async () => {
      const client = makeClient();
      const service = makeService(client);

      const result = await service.generateToken('vonage-123', 'TENANT');

      expect(result).toEqual({
        token: 'tok-abc',
        expiresAt: new Date(NOW_MS + ONE_HOUR_S * 1000),
      });
      expect(client.generateClientToken).toHaveBeenCalledWith(
        'vonage-123',
        expect.objectContaining({ expireTime: NOW_S + ONE_HOUR_S }),
      );
    });

    it.each(['TENANT', 'TECHNICIAN'] as const)(
      'CA-03 · %s entra como publisher y su rol va en data',
      async (role) => {
        const client = makeClient();
        const service = makeService(client);

        await service.generateToken('vonage-123', role);

        expect(client.generateClientToken).toHaveBeenCalledWith(
          'vonage-123',
          expect.objectContaining({
            role: 'publisher',
            data: JSON.stringify({ role }),
          }),
        );
      },
    );

    it('CA-04 · MANAGER no puede pedir token y no se llama al SDK', async () => {
      const client = makeClient();
      const service = makeService(client);

      await expect(
        service.generateToken('vonage-123', 'MANAGER'),
      ).rejects.toThrow();
      expect(client.generateClientToken).not.toHaveBeenCalled();
    });

    it('CA-06 · propaga el error si el SDK falla', async () => {
      const client = makeClient({
        generateClientToken: vi.fn().mockImplementation(() => {
          throw new Error('token inválido');
        }),
      });
      const service = makeService(client);

      await expect(
        service.generateToken('vonage-123', 'TENANT'),
      ).rejects.toThrow('token inválido');
    });
  });
});

describe('createVonageVideoService', () => {
  it('CA-05 · sin credenciales la app arranca, pero las llamadas fallan con un error claro', async () => {
    // Crear el service no debe lanzar: la app tiene que arrancar sin .env de Vonage.
    const service = createVonageVideoService({
      applicationId: undefined,
      privateKeyPath: undefined,
    });

    await expect(service.createSession('visit_demo')).rejects.toThrow(
      /credenciales de vonage video no configuradas/i,
    );
    await expect(
      service.generateToken('vonage-123', 'TENANT'),
    ).rejects.toThrow(/credenciales de vonage video no configuradas/i);
  });

  it('CA-05b · si VONAGE_PRIVATE_KEY_PATH apunta a un archivo que no existe, el error lo dice claro', async () => {
    const service = createVonageVideoService({
      applicationId: 'app-id-test',
      privateKeyPath: './no-existe/private.key',
    });

    await expect(service.createSession('visit_demo')).rejects.toThrow(
      /no se encuentra el private\.key/i,
    );
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';

import { HttpError } from './client.js';
import { requestVideoToken } from './video.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('requestVideoToken', () => {
  it('pide el token con el body y las cabeceras del rol', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        applicationId: 'app_demo',
        sessionId: 'sess_demo',
        token: 'token_demo',
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const response = await requestVideoToken('inc_demo', 'TECHNICIAN');

    expect(response).toEqual({
      applicationId: 'app_demo',
      sessionId: 'sess_demo',
      token: 'token_demo',
    });
    expect(fetchMock).toHaveBeenCalledWith('/api/video-tokens', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-User-Id': 'usr_technician_demo',
        'X-User-Role': 'TECHNICIAN',
      },
      body: JSON.stringify({ incidentId: 'inc_demo' }),
    });
  });

  it('lanza HttpError con el status cuando la API responde 409', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({ error: 'La visita no está disponible' }),
      }),
    );

    const error = await requestVideoToken('inc_demo', 'TENANT').catch(
      (err: unknown) => err,
    );

    expect(error).toBeInstanceOf(HttpError);
    expect(error).toMatchObject({ status: 409 });
  });

  it('propaga un fallo de red', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    await expect(requestVideoToken('inc_demo', 'TENANT')).rejects.toThrow(
      'offline',
    );
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';

import { getJson, HttpError, postJson } from './client.js';

function jsonResponse<T>(data: T, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('api/client', () => {
  it('getJson envía Accept y las cabeceras del rol y devuelve el JSON', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ id: 'inc_demo' }));
    vi.stubGlobal('fetch', fetchMock);

    const data = await getJson<{ id: string }>('/api/incidents/inc_demo', {
      headers: { 'X-User-Role': 'TENANT' },
    });

    expect(data).toEqual({ id: 'inc_demo' });
    expect(fetchMock).toHaveBeenCalledWith('/api/incidents/inc_demo', {
      headers: {
        Accept: 'application/json',
        'X-User-Role': 'TENANT',
      },
    });
  });

  it('getJson lanza HttpError con el status y el mensaje en un 404', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ error: 'Incident not found' }, 404)),
    );

    const error = await getJson('/api/incidents/inc_demo').catch(
      (err: unknown) => err,
    );

    expect(error).toBeInstanceOf(HttpError);
    expect(error).toMatchObject({
      status: 404,
      message: 'GET /api/incidents/inc_demo respondió 404',
    });
  });

  it('postJson envía Content-Type, las cabeceras del rol y el body serializado', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ token: 'token_demo' }));
    vi.stubGlobal('fetch', fetchMock);
    const body = { incidentId: 'inc_demo' };

    const data = await postJson<{ token: string }, typeof body>(
      '/api/video-tokens',
      body,
      { headers: { 'X-User-Role': 'TENANT' } },
    );

    expect(data).toEqual({ token: 'token_demo' });
    expect(fetchMock).toHaveBeenCalledWith('/api/video-tokens', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-User-Role': 'TENANT',
      },
      body: JSON.stringify(body),
    });
  });

  it('postJson lanza HttpError con el status y el mensaje en un 409', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({ error: 'La visita no está disponible' }, 409),
      ),
    );

    const error = await postJson('/api/video-tokens', {
      incidentId: 'inc_demo',
    }).catch((err: unknown) => err);

    expect(error).toBeInstanceOf(HttpError);
    expect(error).toMatchObject({
      status: 409,
      message: 'POST /api/video-tokens respondió 409',
    });
  });
});

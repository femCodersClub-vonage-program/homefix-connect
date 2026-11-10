import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../db/client.js', () => ({
  prisma: { incident: { findUnique: vi.fn() } },
}));

const { createApp } = await import('../app.js');
const { prisma } = await import('../db/client.js');

const app = createApp();

describe('GET /api/health', () => {
  it('responde 200 con status ok', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.timestamp).toBe('string');
  });
});

describe('GET /api/incidents/:id', () => {
  it('devuelve la incidencia cuando existe', async () => {
    vi.mocked(prisma.incident.findUnique).mockResolvedValueOnce({
      id: 'inc_demo',
      title: 'Fuga en el baño',
      status: 'VISIT_ASSIGNED',
    } as never);

    const res = await request(app).get('/api/incidents/inc_demo');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 'inc_demo' });
  });

  it('devuelve 404 cuando no existe', async () => {
    vi.mocked(prisma.incident.findUnique).mockResolvedValueOnce(null);

    const res = await request(app).get('/api/incidents/nope');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Incident not found');
  });
});

describe('rutas desconocidas', () => {
  it('devuelve 404 en JSON', async () => {
    const res = await request(app).get('/api/no-existe');

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ error: 'Not Found' });
  });
});

import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

// Las rutas reciben repos inyectados; Prisma no se usa en estos tests.
vi.mock('../db/client.js', () => ({ prisma: {} }));

const { createApp } = await import('../app.js');

const app = createApp();

// GET /api/incidents/:id → tests/contract/incidents.contract.test.ts (E0-05).

describe('GET /api/health', () => {
  it('responde 200 con status ok', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.timestamp).toBe('string');
  });
});

describe('rutas desconocidas', () => {
  it('devuelve 404 en JSON', async () => {
    const res = await request(app).get('/api/no-existe');

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ error: 'Not Found' });
  });
});

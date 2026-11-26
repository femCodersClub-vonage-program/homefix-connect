import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

// E0-05 · Contrato de GET /api/health (backend/openapi.yaml).
// Spec: specs/features/E0-05-incidents-contract/02-specification.md

vi.mock('../../src/db/client.js', () => ({ prisma: {} }));

const { createApp } = await import('../../src/app.js');

describe('GET /api/health (contrato)', () => {
  it('HC-1 · 200 con exactamente { status, timestamp } y timestamp ISO 8601', async () => {
    const res = await request(createApp()).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(Object.keys(res.body).sort()).toEqual(['status', 'timestamp']);
    expect(res.body.status).toBe('ok');
    expect(new Date(res.body.timestamp).toISOString()).toBe(res.body.timestamp);
  });

  it('HC-2 · no necesita cabeceras de usuario', async () => {
    const res = await request(createApp())
      .get('/api/health')
      .set('X-User-Role', 'NO_EXISTE');

    expect(res.status).toBe(200);
  });
});

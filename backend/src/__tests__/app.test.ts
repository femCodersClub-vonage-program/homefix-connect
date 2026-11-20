import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
  // Forma exacta del schema `Incident` de backend/openapi.yaml.
  const CONTRACT_SELECT = {
    id: true,
    title: true,
    description: true,
    status: true,
    technician: { select: { id: true, name: true } },
    visit: {
      select: {
        id: true,
        status: true,
        scheduledAt: true,
        videoSession: { select: { id: true, status: true } },
      },
    },
  };

  // Lo que devuelve Prisma con ese select (datos del seed).
  const incidentFromDb = {
    id: 'inc_demo',
    title: 'Fuga de agua en el baño',
    description: 'El grifo del lavabo pierde agua desde ayer.',
    status: 'VISIT_ASSIGNED',
    technician: { id: 'usr_technician_demo', name: 'Técnica Demo' },
    visit: {
      id: 'visit_demo',
      status: 'CONFIRMED',
      scheduledAt: new Date('2026-11-20T10:00:00.000Z'),
      videoSession: { id: 'vs_demo', status: 'PENDING' },
    },
  };

  const FORBIDDEN = [
    'tenant',
    'manager',
    'tenantId',
    'technicianId',
    'managerId',
    'createdAt',
    'updatedAt',
    'phone',
    'email',
    'vonageSessionId',
  ];

  beforeEach(() => {
    vi.mocked(prisma.incident.findUnique).mockReset();
  });

  it('pide a Prisma solo los campos del contrato (select, sin include)', async () => {
    vi.mocked(prisma.incident.findUnique).mockResolvedValueOnce(
      incidentFromDb as never,
    );

    await request(app).get('/api/incidents/inc_demo');

    expect(prisma.incident.findUnique).toHaveBeenCalledTimes(1);
    expect(prisma.incident.findUnique).toHaveBeenCalledWith({
      where: { id: 'inc_demo' },
      select: CONTRACT_SELECT,
    });
  });

  it('CA-1: devuelve 200 solo con los campos del contrato', async () => {
    vi.mocked(prisma.incident.findUnique).mockResolvedValueOnce(
      incidentFromDb as never,
    );

    const res = await request(app).get('/api/incidents/inc_demo');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: 'inc_demo',
      title: 'Fuga de agua en el baño',
      description: 'El grifo del lavabo pierde agua desde ayer.',
      status: 'VISIT_ASSIGNED',
      technician: { id: 'usr_technician_demo', name: 'Técnica Demo' },
      visit: {
        id: 'visit_demo',
        status: 'CONFIRMED',
        scheduledAt: '2026-11-20T10:00:00.000Z',
        videoSession: { id: 'vs_demo', status: 'PENDING' },
      },
    });
  });

  it('CA-2: no expone datos personales ni campos internos', async () => {
    vi.mocked(prisma.incident.findUnique).mockResolvedValueOnce(
      incidentFromDb as never,
    );

    const res = await request(app).get('/api/incidents/inc_demo');
    const json = JSON.stringify(res.body);

    for (const field of FORBIDDEN) {
      expect(json).not.toContain(`"${field}"`);
    }
  });

  it('CA-3: technician y visit son null si no existen', async () => {
    vi.mocked(prisma.incident.findUnique).mockResolvedValueOnce({
      ...incidentFromDb,
      description: null,
      technician: null,
      visit: null,
    } as never);

    const res = await request(app).get('/api/incidents/inc_demo');

    expect(res.status).toBe(200);
    expect(res.body.description).toBeNull();
    expect(res.body.technician).toBeNull();
    expect(res.body.visit).toBeNull();
  });

  it('CA-4: devuelve 404 cuando no existe', async () => {
    vi.mocked(prisma.incident.findUnique).mockResolvedValueOnce(null);

    const res = await request(app).get('/api/incidents/nope');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Incident not found' });
  });
});

describe('rutas desconocidas', () => {
  it('devuelve 404 en JSON', async () => {
    const res = await request(app).get('/api/no-existe');

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ error: 'Not Found' });
  });
});

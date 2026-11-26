import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { prisma } from '../../src/db/client.js';
import { IDS, resetDatabase } from './helpers/db.js';
import { createVideoTestApp, seedVideoVisitData, VIDEO_IDS } from './helpers/video.js';

// E0-05 · GET /api/incidents/:id con el PrismaIncidentRepo real (INT-I1 a INT-I3).
// Spec: specs/features/E0-05-incidents-contract/02-specification.md

beforeEach(async () => {
  await resetDatabase(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('GET /api/incidents/:id con Postgres (integración)', () => {
  it('INT-I1 · la inquilina recibe solo los campos del contrato, sin teléfonos', async () => {
    await seedVideoVisitData(prisma, { sessionStatus: 'ACTIVE', vonageSessionId: VIDEO_IDS.vonageSession });
    const { app } = createVideoTestApp();

    const res = await request(app)
      .get(`/api/incidents/${IDS.incident}`)
      .set('X-User-Id', IDS.tenant)
      .set('X-User-Role', 'TENANT');

    expect(res.status).toBe(200);
    expect(Object.keys(res.body).sort()).toEqual(
      ['description', 'id', 'status', 'technician', 'title', 'visit'].sort(),
    );
    expect(res.body.technician).toEqual({ id: IDS.technician, name: 'Técnica Demo' });
    expect(res.body.visit).toEqual({
      id: VIDEO_IDS.visit,
      status: 'CONFIRMED',
      scheduledAt: '2026-12-01T10:00:00.000Z',
      videoSession: { id: VIDEO_IDS.videoSession, status: 'ACTIVE' },
    });
    const json = JSON.stringify(res.body);
    expect(json).not.toContain('+3460000000');
    expect(json).not.toContain(VIDEO_IDS.vonageSession);
  });

  it('INT-I2 · la gestora de la incidencia también puede verla', async () => {
    await seedVideoVisitData(prisma);
    const { app } = createVideoTestApp();

    const res = await request(app)
      .get(`/api/incidents/${IDS.incident}`)
      .set('X-User-Id', IDS.manager)
      .set('X-User-Role', 'MANAGER');

    expect(res.status).toBe(200);
  });

  it('INT-I3 · un usuario que no participa → 403; sin cabeceras → 401', async () => {
    await seedVideoVisitData(prisma);
    const { app } = createVideoTestApp();

    const forbidden = await request(app)
      .get(`/api/incidents/${IDS.incident}`)
      .set('X-User-Id', 'usr_otra')
      .set('X-User-Role', 'TENANT');
    const anonymous = await request(app).get(`/api/incidents/${IDS.incident}`);

    expect(forbidden.status).toBe(403);
    expect(anonymous.status).toBe(401);
  });
});

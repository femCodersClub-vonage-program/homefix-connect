import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { prisma } from '../../src/db/client.js';
import { IDS, resetDatabase } from './helpers/db.js';
import { createVideoTestApp, seedVideoVisitData, VIDEO_IDS } from './helpers/video.js';

// E3-02 · POST /api/incidents/{id}/close con Postgres real (INT-C1 a INT-C3).
// Spec: specs/features/E3-02-close-incident/02-specification.md

type App = ReturnType<typeof createVideoTestApp>['app'];

const close = (app: App) =>
  request(app)
    .post(`/api/incidents/${IDS.incident}/close`)
    .set('X-User-Id', IDS.manager)
    .set('X-User-Role', 'MANAGER');

const visitStatus = (app: App, status: string) =>
  request(app)
    .post(`/api/incidents/${IDS.incident}/visit-status`)
    .set('X-User-Id', IDS.technician)
    .set('X-User-Role', 'TECHNICIAN')
    .send({ status });

const incidentStatus = async () =>
  (await prisma.incident.findUniqueOrThrow({ where: { id: IDS.incident } })).status;

beforeEach(async () => {
  await resetDatabase(prisma);
  await seedVideoVisitData(prisma, { sessionStatus: 'ACTIVE', vonageSessionId: VIDEO_IDS.vonageSession });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('POST /api/incidents/{id}/close con Postgres (integración)', () => {
  it('INT-C1 · técnica Completada → gestora cierra → CLOSED; la segunda vez already_closed', async () => {
    const { app } = createVideoTestApp();
    await visitStatus(app, 'COMPLETED');

    const first = await close(app);
    const second = await close(app);

    expect(first.body).toEqual({ status: 'closed' });
    expect(second.body).toEqual({ status: 'already_closed' });
    expect(await incidentStatus()).toBe('CLOSED');
  });

  it('INT-C2 · sin visita completada → 409 y no cambia', async () => {
    const { app } = createVideoTestApp();

    const res = await close(app);

    expect(res.status).toBe(409);
    expect(await incidentStatus()).toBe('VISIT_ASSIGNED');
  });

  it('INT-C3 · cerrada → la técnica ya no puede corregir (409 de visit-status)', async () => {
    const { app } = createVideoTestApp();
    await visitStatus(app, 'COMPLETED');
    await close(app);

    const res = await visitStatus(app, 'CANCELLED');

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: 'Incident is closed' });
  });
});

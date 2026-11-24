import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { prisma } from '../../src/db/client.js';
import { IDS, resetDatabase } from './helpers/db.js';
import { createVideoTestApp, seedVideoVisitData, VIDEO_IDS } from './helpers/video.js';

// A5 · POST /api/video-tokens con Prisma real (INT-V5 a INT-V8). Vonage Video falso.
// Spec: specs/features/A5-video-tests/02-specification.md

type App = ReturnType<typeof createVideoTestApp>['app'];

function askToken(app: App, userId: string, role: string) {
  return request(app)
    .post('/api/video-tokens')
    .set('X-User-Id', userId)
    .set('X-User-Role', role)
    .send({ incidentId: IDS.incident });
}

function sessionInDb() {
  return prisma.videoSession.findUniqueOrThrow({ where: { id: VIDEO_IDS.videoSession } });
}

beforeEach(async () => {
  await resetDatabase(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('POST /api/video-tokens con Postgres (integración)', () => {
  it('INT-V5 · primera entrada (inquilina): crea la sala, la guarda en BD y pasa a ACTIVE', async () => {
    await seedVideoVisitData(prisma);
    const { app, videoService } = createVideoTestApp();

    const res = await askToken(app, IDS.tenant, 'TENANT');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      applicationId: VIDEO_IDS.applicationId,
      sessionId: VIDEO_IDS.vonageSession,
      token: `token-TENANT-${VIDEO_IDS.vonageSession}`,
    });
    expect(videoService.createSession).toHaveBeenCalledOnce();
    expect(videoService.createSession).toHaveBeenCalledWith(VIDEO_IDS.visit);
    const row = await sessionInDb();
    expect(row).toMatchObject({ vonageSessionId: VIDEO_IDS.vonageSession, status: 'ACTIVE' });
    expect(row.startedAt).toBeInstanceOf(Date);
  });

  it('INT-V6 · después entra la técnica: misma sala, no se crea otra y startedAt no cambia', async () => {
    await seedVideoVisitData(prisma);
    const { app, videoService } = createVideoTestApp();

    await askToken(app, IDS.tenant, 'TENANT');
    const { startedAt } = await sessionInDb();
    const res = await askToken(app, IDS.technician, 'TECHNICIAN');

    expect(res.status).toBe(200);
    expect(res.body.sessionId).toBe(VIDEO_IDS.vonageSession);
    expect(videoService.createSession).toHaveBeenCalledOnce();
    expect(videoService.generateToken).toHaveBeenLastCalledWith(VIDEO_IDS.vonageSession, 'TECHNICIAN');
    expect((await sessionInDb()).startedAt).toEqual(startedAt);
  });

  it('INT-V7 · dos peticiones a la vez: una sola sala de Vonage y la BD guarda esa', async () => {
    await seedVideoVisitData(prisma);
    const { app, videoService } = createVideoTestApp();

    const [a, b] = await Promise.all([
      askToken(app, IDS.tenant, 'TENANT'),
      askToken(app, IDS.technician, 'TECHNICIAN'),
    ]);

    expect([a.status, b.status]).toEqual([200, 200]);
    expect(a.body.sessionId).toBe(b.body.sessionId);
    expect(videoService.createSession).toHaveBeenCalledOnce();
    expect((await sessionInDb()).vonageSessionId).toBe(VIDEO_IDS.vonageSession);
  });

  it('INT-V8 · sesión ENDED en BD → 409 sin llamar a Vonage', async () => {
    await seedVideoVisitData(prisma, { sessionStatus: 'ENDED', vonageSessionId: VIDEO_IDS.vonageSession });
    const { app, videoService } = createVideoTestApp();

    const res = await askToken(app, IDS.tenant, 'TENANT');

    expect(res.status).toBe(409);
    expect(videoService.createSession).not.toHaveBeenCalled();
    expect(videoService.generateToken).not.toHaveBeenCalled();
  });
});

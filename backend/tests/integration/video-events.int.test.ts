import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { prisma } from '../../src/db/client.js';
import { signVonageJwt } from '../../src/__tests__/helpers/vonageJwt.js';
import { vonageVideoEvent } from '../fixtures/vonage-video/index.js';
import { IDS, resetDatabase } from './helpers/db.js';
import {
  createVideoTestApp,
  fakeMessaging,
  seedVideoVisitData,
  VIDEO_IDS,
} from './helpers/video.js';

// A5 · POST /api/webhooks/video-events con Prisma real (INT-V9 a INT-V13; E0-02: INT-V14/V15).
// Firma real (X3) con secreto de test; aviso post-visita real (B3) con SMS falsos.
// Spec: specs/features/A5-video-tests/02-specification.md

type App = ReturnType<typeof createVideoTestApp>['app'];

function sendEvent(app: App, payload: Record<string, unknown>) {
  const body = JSON.stringify(payload);
  return request(app)
    .post('/api/webhooks/video-events')
    .set('Content-Type', 'application/json')
    .set('Authorization', `Bearer ${signVonageJwt(body)}`)
    .send(body);
}

// Payload oficial de Vonage (tests/fixtures/vonage-video) con la sala del test.
const sessionDestroyed = (sessionId: string = VIDEO_IDS.vonageSession) =>
  vonageVideoEvent('session-destroyed', { sessionId });

async function dbState() {
  const [session, incident, notifications] = await Promise.all([
    prisma.videoSession.findUniqueOrThrow({ where: { id: VIDEO_IDS.videoSession } }),
    prisma.incident.findUniqueOrThrow({ where: { id: IDS.incident } }),
    prisma.notification.findMany({ where: { incidentId: IDS.incident } }),
  ]);
  return { session, incident, notifications };
}

beforeEach(async () => {
  await resetDatabase(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('POST /api/webhooks/video-events con Postgres (integración)', () => {
  it('INT-V9 · sessionDestroyed cierra la visita en BD y deja 2 Notification QUEUED', async () => {
    await seedVideoVisitData(prisma, { sessionStatus: 'ACTIVE', vonageSessionId: VIDEO_IDS.vonageSession });
    const { app, messaging } = createVideoTestApp();

    const res = await sendEvent(app, sessionDestroyed());

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'processed' });
    const { session, incident, notifications } = await dbState();
    expect(session.status).toBe('ENDED');
    expect(session.endedAt).toBeInstanceOf(Date);
    expect(incident.status).toBe('VIDEO_COMPLETED');
    expect(messaging.sendSms).toHaveBeenCalledTimes(2);
    expect(notifications).toHaveLength(2);
    expect(notifications.map((n) => n.recipientId).sort()).toEqual([IDS.manager, IDS.tenant].sort());
    expect(notifications.every((n) => n.status === 'QUEUED')).toBe(true);
  });

  it('INT-V10 · el mismo evento dos veces: already_processed, sin SMS ni filas nuevas', async () => {
    await seedVideoVisitData(prisma, { sessionStatus: 'ACTIVE', vonageSessionId: VIDEO_IDS.vonageSession });
    const { app, messaging } = createVideoTestApp();

    await sendEvent(app, sessionDestroyed());
    const { session: afterFirst } = await dbState();
    const second = await sendEvent(app, sessionDestroyed());

    expect(second.status).toBe(200);
    expect(second.body).toEqual({ status: 'already_processed' });
    expect(messaging.sendSms).toHaveBeenCalledTimes(2);
    const { session, notifications } = await dbState();
    expect(notifications).toHaveLength(2);
    expect(session.endedAt).toEqual(afterFirst.endedAt);
  });

  it('INT-V11 · sesión desconocida → 200 ignored (E0-02) y la BD no cambia', async () => {
    await seedVideoVisitData(prisma, { sessionStatus: 'ACTIVE', vonageSessionId: VIDEO_IDS.vonageSession });
    const { app, messaging } = createVideoTestApp();

    const res = await sendEvent(app, sessionDestroyed('vonage-desconocida'));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ignored' });
    const { session, incident, notifications } = await dbState();
    expect(session.status).toBe('ACTIVE');
    expect(incident.status).toBe('VISIT_ASSIGNED');
    expect(notifications).toHaveLength(0);
    expect(messaging.sendSms).not.toHaveBeenCalled();
  });

  it('INT-V12 · si los SMS fallan, la visita queda cerrada y las Notification en FAILED', async () => {
    await seedVideoVisitData(prisma, { sessionStatus: 'ACTIVE', vonageSessionId: VIDEO_IDS.vonageSession });
    const messaging = fakeMessaging();
    messaging.sendSms.mockRejectedValue(Object.assign(new Error('x'), { name: 'VonageNetworkError' }));
    const { app } = createVideoTestApp({ messaging });

    const res = await sendEvent(app, sessionDestroyed());

    expect(res.status).toBe(200);
    const { session, incident, notifications } = await dbState();
    expect(session.status).toBe('ENDED');
    expect(incident.status).toBe('VIDEO_COMPLETED');
    expect(notifications).toHaveLength(2);
    expect(notifications.every((n) => n.status === 'FAILED' && n.error === 'VonageNetworkError')).toBe(true);
  });

  it('INT-V13 · flujo completo: tokens de las dos → sessionDestroyed → ya no se puede volver a entrar', async () => {
    await seedVideoVisitData(prisma);
    const { app, videoService, messaging } = createVideoTestApp();
    const askToken = (userId: string, role: string) =>
      request(app)
        .post('/api/video-tokens')
        .set('X-User-Id', userId)
        .set('X-User-Role', role)
        .send({ incidentId: IDS.incident });

    const tenant = await askToken(IDS.tenant, 'TENANT');
    const technician = await askToken(IDS.technician, 'TECHNICIAN');
    const end = await sendEvent(app, sessionDestroyed(tenant.body.sessionId));
    const late = await askToken(IDS.tenant, 'TENANT');

    expect([tenant.status, technician.status, end.status]).toEqual([200, 200, 200]);
    expect(technician.body.sessionId).toBe(tenant.body.sessionId);
    expect(end.body).toEqual({ status: 'processed' });
    expect(late.status).toBe(409);
    expect(videoService.createSession).toHaveBeenCalledOnce();
    expect(messaging.sendSms).toHaveBeenCalledTimes(2);
    const { session, incident, notifications } = await dbState();
    expect(session).toMatchObject({ status: 'ENDED', vonageSessionId: VIDEO_IDS.vonageSession });
    expect(incident.status).toBe('VIDEO_COMPLETED');
    expect(notifications).toHaveLength(2);
  });

  it('INT-V14 · E0-02: incidencia ya VIDEO_COMPLETED con sesión ACTIVE → la sesión se cierra, sin SMS', async () => {
    await seedVideoVisitData(prisma, { sessionStatus: 'ACTIVE', vonageSessionId: VIDEO_IDS.vonageSession });
    await prisma.incident.update({ where: { id: IDS.incident }, data: { status: 'VIDEO_COMPLETED' } });
    const { app, messaging } = createVideoTestApp();

    const res = await sendEvent(app, sessionDestroyed());

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'already_processed' });
    const { session, incident, notifications } = await dbState();
    expect(session.status).toBe('ENDED');
    expect(session.endedAt).toBeInstanceOf(Date);
    expect(incident.status).toBe('VIDEO_COMPLETED');
    expect(notifications).toHaveLength(0);
    expect(messaging.sendSms).not.toHaveBeenCalled();
  });

  it('INT-V15 · E0-02: reason serverRotation → 200 ignored y la BD no cambia', async () => {
    await seedVideoVisitData(prisma, { sessionStatus: 'ACTIVE', vonageSessionId: VIDEO_IDS.vonageSession });
    const { app, messaging } = createVideoTestApp();

    const res = await sendEvent(app, {
      ...sessionDestroyed(),
      reason: 'serverRotation',
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ignored' });
    const { session, incident, notifications } = await dbState();
    expect(session.status).toBe('ACTIVE');
    expect(incident.status).toBe('VISIT_ASSIGNED');
    expect(notifications).toHaveLength(0);
    expect(messaging.sendSms).not.toHaveBeenCalled();
  });
});

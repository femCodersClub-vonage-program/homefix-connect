import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { prisma } from '../../src/db/client.js';
import { IDS, resetDatabase } from './helpers/db.js';
import { createVideoTestApp, fakeMessaging, seedVideoVisitData, VIDEO_IDS } from './helpers/video.js';

// E1-02 · POST /api/incidents/{id}/visit-status con Postgres real (INT-VS1 a INT-VS5).
// Spec: specs/features/E1-02-visit-status/02-specification.md

type App = ReturnType<typeof createVideoTestApp>['app'];

function changeStatus(app: App, status: string, userId: string = IDS.technician, role = 'TECHNICIAN') {
  return request(app)
    .post(`/api/incidents/${IDS.incident}/visit-status`)
    .set('X-User-Id', userId)
    .set('X-User-Role', role)
    .send({ status });
}

async function state() {
  const incident = await prisma.incident.findUniqueOrThrow({
    where: { id: IDS.incident },
    include: { visit: true },
  });
  const notifications = await prisma.notification.findMany({ where: { incidentId: IDS.incident } });
  return { incident, visit: incident.visit!, notifications };
}

beforeEach(async () => {
  await resetDatabase(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('POST /api/incidents/{id}/visit-status con Postgres (integración)', () => {
  it('INT-VS1 · COMPLETED: visita + incidencia en la BD y 2 Notification', async () => {
    await seedVideoVisitData(prisma, { sessionStatus: 'ACTIVE', vonageSessionId: VIDEO_IDS.vonageSession });
    const messaging = fakeMessaging();
    const { app } = createVideoTestApp({ messaging });

    const res = await changeStatus(app, 'COMPLETED');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'completed', notifications: { sent: 2, failed: 0, skipped: 0 } });
    const { incident, visit, notifications } = await state();
    expect(incident.status).toBe('VIDEO_COMPLETED');
    expect(visit.status).toBe('COMPLETED');
    expect(visit.completedAt).toBeInstanceOf(Date);
    expect(notifications).toHaveLength(2);
    expect(messaging.sendSms).toHaveBeenCalledTimes(2);
  });

  it('INT-VS2 · CANCELLED: visita CANCELLED, completedAt null, VISIT_ASSIGNED y sin SMS', async () => {
    await seedVideoVisitData(prisma, { sessionStatus: 'ACTIVE', vonageSessionId: VIDEO_IDS.vonageSession });
    const messaging = fakeMessaging();
    const { app } = createVideoTestApp({ messaging });

    const res = await changeStatus(app, 'CANCELLED');

    expect(res.body).toEqual({ status: 'not_completed' });
    const { incident, visit, notifications } = await state();
    expect(incident.status).toBe('VISIT_ASSIGNED');
    expect(visit).toMatchObject({ status: 'CANCELLED', completedAt: null });
    expect(notifications).toHaveLength(0);
    expect(messaging.sendSms).not.toHaveBeenCalled();
  });

  it('INT-VS3 · COMPLETED → CANCELLED → COMPLETED: los SMS salen una sola vez (E4-02)', async () => {
    await seedVideoVisitData(prisma, { sessionStatus: 'ACTIVE', vonageSessionId: VIDEO_IDS.vonageSession });
    const messaging = fakeMessaging();
    const { app } = createVideoTestApp({ messaging });

    await changeStatus(app, 'COMPLETED');
    await changeStatus(app, 'CANCELLED');
    const res = await changeStatus(app, 'COMPLETED');

    expect(res.body).toEqual({ status: 'completed', notifications: { sent: 0, failed: 0, skipped: 2 } });
    expect(messaging.sendSms).toHaveBeenCalledTimes(2);
    expect((await state()).notifications).toHaveLength(2);
  });

  it('INT-VS4 · 409 con la sesión PENDING (no hubo videollamada): no cambia nada', async () => {
    await seedVideoVisitData(prisma);
    const { app } = createVideoTestApp();

    const res = await changeStatus(app, 'COMPLETED');

    expect(res.status).toBe(409);
    const { incident, visit } = await state();
    expect(incident.status).toBe('VISIT_ASSIGNED');
    expect(visit.status).toBe('CONFIRMED');
  });

  it('INT-VS5 · 409 si la incidencia está CLOSED', async () => {
    await seedVideoVisitData(prisma, { sessionStatus: 'ENDED', vonageSessionId: VIDEO_IDS.vonageSession });
    await prisma.incident.update({ where: { id: IDS.incident }, data: { status: 'CLOSED' } });
    const { app } = createVideoTestApp();

    const res = await changeStatus(app, 'CANCELLED');

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: 'Incident is closed' });
  });
});

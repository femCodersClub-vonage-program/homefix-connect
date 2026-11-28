import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { prisma } from '../../src/db/client.js';
import { signVonageJwt } from '../../src/__tests__/helpers/vonageJwt.js';
import { vonageVideoEvent } from '../fixtures/vonage-video/index.js';
import { IDS, resetDatabase } from './helpers/db.js';
import { createVideoTestApp, seedVideoVisitData, VIDEO_IDS } from './helpers/video.js';

// E2-01 · POST /api/webhooks/message-status con Prisma real (INT-M1 a INT-M3).
// Firma real (X3) con secreto de test; SMS falsos (msg-1, msg-2…).
// Spec: specs/features/E2-01-message-status/02-specification.md

type App = ReturnType<typeof createVideoTestApp>['app'];

function sendSigned(app: App, url: string, payload: Record<string, unknown>) {
  const body = JSON.stringify(payload);
  return request(app)
    .post(url)
    .set('Content-Type', 'application/json')
    .set('Authorization', `Bearer ${signVonageJwt(body)}`)
    .send(body);
}

const messageStatus = (messageUuid: string, status: string, extra: Record<string, unknown> = {}) => ({
  message_uuid: messageUuid,
  to: '34600000001',
  from: 'Homefix',
  timestamp: '2026-11-25T20:00:05.000Z',
  status,
  channel: 'sms',
  ...extra,
});

async function notificationFor(recipientId: string) {
  return prisma.notification.findFirstOrThrow({
    where: { incidentId: IDS.incident, recipientId },
  });
}

/** Cierra la visita como Vonage (A4) para que se creen las 2 Notification. */
async function closeVisit(app: App) {
  await sendSigned(
    app,
    '/api/webhooks/video-events',
    vonageVideoEvent('session-destroyed', { sessionId: VIDEO_IDS.vonageSession }),
  );
}

beforeEach(async () => {
  await resetDatabase(prisma);
  await seedVideoVisitData(prisma, { sessionStatus: 'ACTIVE', vonageSessionId: VIDEO_IDS.vonageSession });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('POST /api/webhooks/message-status con Postgres (integración)', () => {
  it('INT-M1 · flujo B3 → B4: tras el aviso post-visita, delivered marca la Notification', async () => {
    const { app } = createVideoTestApp();
    await closeVisit(app);
    const tenant = await notificationFor(IDS.tenant);
    expect(tenant.status).toBe('QUEUED');

    const res = await sendSigned(app, '/api/webhooks/message-status', messageStatus(tenant.providerMessageId!, 'delivered'));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'processed' });
    const updated = await notificationFor(IDS.tenant);
    expect(updated.status).toBe('DELIVERED');
    expect(updated.deliveredAt).toEqual(new Date('2026-11-25T20:00:05.000Z'));
    expect((await notificationFor(IDS.manager)).status).toBe('QUEUED');
  });

  it('INT-M2 · rejected → FAILED con error; un delivered posterior lo corrige', async () => {
    const { app } = createVideoTestApp();
    await closeVisit(app);
    const manager = await notificationFor(IDS.manager);
    const uuid = manager.providerMessageId!;

    await sendSigned(
      app,
      '/api/webhooks/message-status',
      messageStatus(uuid, 'rejected', { error: { title: 1340, detail: 'Outbound message rejected' } }),
    );
    expect(await notificationFor(IDS.manager)).toMatchObject({
      status: 'FAILED',
      error: '1340: Outbound message rejected',
    });

    await sendSigned(app, '/api/webhooks/message-status', messageStatus(uuid, 'delivered'));
    expect(await notificationFor(IDS.manager)).toMatchObject({ status: 'DELIVERED', error: null });
  });

  it('INT-M3 · message_uuid desconocido → 200 ignored y la BD no cambia', async () => {
    const { app } = createVideoTestApp();
    await closeVisit(app);

    const res = await sendSigned(app, '/api/webhooks/message-status', messageStatus('no-existe', 'delivered'));

    expect(res.body).toEqual({ status: 'ignored' });
    const rows = await prisma.notification.findMany({ where: { incidentId: IDS.incident } });
    expect(rows.every((n) => n.status === 'QUEUED')).toBe(true);
  });
});

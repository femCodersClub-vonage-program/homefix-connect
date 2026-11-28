import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '../../src/db/client.js';
import { PrismaIncidentRepo } from '../../src/repositories/prisma-incident.repo.js';
import { PrismaNotificationRepo } from '../../src/repositories/prisma-notification.repo.js';
import {
  MessagingPostVisitNotifier,
  type MessagingService,
} from '../../src/services/messaging.service.js';
import { IDS, resetDatabase, seedPostVisitData } from './helpers/db.js';

// B5 · sendPostVisit con Prisma real (INT-4 a INT-7). MessagingService falso: sin SMS reales.
// Spec: specs/features/B5-messaging-tests/02-specification.md

function setup() {
  const messaging: MessagingService & { sendSms: ReturnType<typeof vi.fn> } = {
    sendSms: vi
      .fn()
      .mockResolvedValueOnce({ providerMessageId: 'msg-gestora' })
      .mockResolvedValueOnce({ providerMessageId: 'msg-inquilina' }),
  };
  const notifier = new MessagingPostVisitNotifier({
    messaging,
    incidentRepo: new PrismaIncidentRepo(prisma),
    notificationRepo: new PrismaNotificationRepo(prisma),
  });
  return { messaging, notifier };
}

function notificationsInDb() {
  return prisma.notification.findMany({
    where: { incidentId: IDS.incident },
    orderBy: { createdAt: 'asc' },
  });
}

beforeEach(async () => {
  await resetDatabase(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('sendPostVisit con Postgres (integración)', () => {
  it('INT-4 · envío completo: 2 Notification QUEUED en la BD', async () => {
    await seedPostVisitData(prisma);
    const { messaging, notifier } = setup();

    await notifier.sendPostVisit(IDS.incident, '');

    expect(messaging.sendSms).toHaveBeenCalledTimes(2);
    const rows = await notificationsInDb();
    expect(rows).toHaveLength(2);
    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          recipientId: IDS.manager,
          status: 'QUEUED',
          template: 'post_visit',
          providerMessageId: 'msg-gestora',
        }),
        expect.objectContaining({
          recipientId: IDS.tenant,
          status: 'QUEUED',
          providerMessageId: 'msg-inquilina',
        }),
      ]),
    );
  });

  it('INT-5 · idempotencia: la segunda llamada no envía ni crea filas', async () => {
    await seedPostVisitData(prisma);
    const { messaging, notifier } = setup();

    await notifier.sendPostVisit(IDS.incident, '');
    const second = await notifier.sendPostVisit(IDS.incident, '');

    expect(messaging.sendSms).toHaveBeenCalledTimes(2);
    expect(second.skipped.every((s) => s.reason === 'ALREADY_SENT')).toBe(true);
    expect(await notificationsInDb()).toHaveLength(2);
  });

  it('INT-6 · falla el SMS de la gestora: fila FAILED + fila QUEUED', async () => {
    await seedPostVisitData(prisma);
    const { messaging, notifier } = setup();
    messaging.sendSms
      .mockReset()
      .mockRejectedValueOnce(Object.assign(new Error('x'), { name: 'VonageNetworkError' }))
      .mockResolvedValueOnce({ providerMessageId: 'msg-inquilina' });

    await notifier.sendPostVisit(IDS.incident, '');

    const rows = await notificationsInDb();
    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          recipientId: IDS.manager,
          status: 'FAILED',
          error: 'VonageNetworkError',
          sentAt: null,
        }),
        expect.objectContaining({ recipientId: IDS.tenant, status: 'QUEUED' }),
      ]),
    );
  });

  it('INT-7 · sin gestora: una sola fila (inquilina)', async () => {
    await seedPostVisitData(prisma, { withManager: false });
    const { messaging, notifier } = setup();
    messaging.sendSms.mockReset().mockResolvedValue({ providerMessageId: 'msg-inquilina' });

    const result = await notifier.sendPostVisit(IDS.incident, '');

    const rows = await notificationsInDb();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ recipientId: IDS.tenant, status: 'QUEUED' });
    expect(result.skipped).toEqual([{ role: 'MANAGER', reason: 'NO_MANAGER' }]);
  });

  it('INT-E4-3 · la gestora ya tiene registro: solo se envía a la inquilina (E4-02)', async () => {
    await seedPostVisitData(prisma);
    await prisma.notification.create({
      data: {
        incidentId: IDS.incident,
        recipientId: IDS.manager,
        template: 'post_visit',
        status: 'FAILED',
        error: 'VonageNetworkError',
      },
    });
    const { messaging, notifier } = setup();
    messaging.sendSms.mockReset().mockResolvedValue({ providerMessageId: 'msg-inquilina' });

    const result = await notifier.sendPostVisit(IDS.incident, '');

    expect(messaging.sendSms).toHaveBeenCalledTimes(1);
    expect(result.skipped).toEqual([{ role: 'MANAGER', reason: 'ALREADY_SENT' }]);
    const rows = await notificationsInDb();
    expect(rows).toHaveLength(2);
    expect(rows[1]).toMatchObject({ recipientId: IDS.tenant, status: 'QUEUED' });
  });

  it('INT-E4-4 · dos llamadas a la vez: una fila por destinataria y ningún 500', async () => {
    await seedPostVisitData(prisma);
    const messaging: MessagingService = {
      sendSms: vi.fn().mockImplementation(async () => ({
        providerMessageId: `msg-${Math.random().toString(36).slice(2)}`,
      })),
    };
    const notifier = new MessagingPostVisitNotifier({
      messaging,
      incidentRepo: new PrismaIncidentRepo(prisma),
      notificationRepo: new PrismaNotificationRepo(prisma),
    });

    const results = await Promise.all([
      notifier.sendPostVisit(IDS.incident, ''),
      notifier.sendPostVisit(IDS.incident, ''),
    ]);

    const rows = await notificationsInDb();
    expect(rows).toHaveLength(2);
    expect(new Set(rows.map((r) => r.recipientId))).toEqual(new Set([IDS.manager, IDS.tenant]));
    const sent = results.flatMap((r) => r.sent);
    expect(sent).toHaveLength(2);
  });
});

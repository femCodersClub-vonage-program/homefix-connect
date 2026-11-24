import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { prisma } from '../../src/db/client.js';
import { PrismaNotificationRepo } from '../../src/repositories/prisma-notification.repo.js';
import { IDS, resetDatabase, seedPostVisitData } from './helpers/db.js';

// B5 · PrismaNotificationRepo contra Postgres real (INT-1 a INT-3).
// Spec: specs/features/B5-messaging-tests/02-specification.md

const repo = new PrismaNotificationRepo(prisma);

beforeEach(async () => {
  await resetDatabase(prisma);
  await seedPostVisitData(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('PrismaNotificationRepo (integración)', () => {
  it('INT-1 · usa la BD de test', async () => {
    const [{ current_database }] = await prisma.$queryRaw<
      { current_database: string }[]
    >`SELECT current_database()`;
    expect(current_database.endsWith('_test')).toBe(true);
  });

  it('INT-1 · create QUEUED guarda la fila con channel SMS y fechas', async () => {
    const sentAt = new Date();

    const created = await repo.create({
      incidentId: IDS.incident,
      recipientId: IDS.tenant,
      template: 'post_visit',
      status: 'QUEUED',
      providerMessageId: 'msg-1',
      sentAt,
    });

    const row = await prisma.notification.findUniqueOrThrow({ where: { id: created.id } });
    expect(row).toMatchObject({
      incidentId: IDS.incident,
      recipientId: IDS.tenant,
      template: 'post_visit',
      status: 'QUEUED',
      channel: 'SMS',
      providerMessageId: 'msg-1',
      error: null,
    });
    expect(row.sentAt?.getTime()).toBe(sentAt.getTime());
    expect(row.createdAt).toBeInstanceOf(Date);
    expect(row.updatedAt).toBeInstanceOf(Date);
  });

  it('INT-2 · create FAILED guarda el error y sentAt null', async () => {
    const created = await repo.create({
      incidentId: IDS.incident,
      recipientId: IDS.manager,
      template: 'post_visit',
      status: 'FAILED',
      error: 'VonageNetworkError',
      sentAt: null,
    });

    const row = await prisma.notification.findUniqueOrThrow({ where: { id: created.id } });
    expect(row).toMatchObject({
      status: 'FAILED',
      error: 'VonageNetworkError',
      providerMessageId: null,
      sentAt: null,
    });
  });

  it('INT-3 · existsForIncident: solo true con misma incidencia y misma plantilla', async () => {
    expect(await repo.existsForIncident(IDS.incident, 'post_visit')).toBe(false);

    await repo.create({
      incidentId: IDS.incident,
      recipientId: IDS.tenant,
      template: 'otra_plantilla',
      status: 'QUEUED',
    });
    expect(await repo.existsForIncident(IDS.incident, 'post_visit')).toBe(false);
    expect(await repo.existsForIncident('inc_otra', 'otra_plantilla')).toBe(false);

    await repo.create({
      incidentId: IDS.incident,
      recipientId: IDS.tenant,
      template: 'post_visit',
      status: 'QUEUED',
    });
    expect(await repo.existsForIncident(IDS.incident, 'post_visit')).toBe(true);
  });
});

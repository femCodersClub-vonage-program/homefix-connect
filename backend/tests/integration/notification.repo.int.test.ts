import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { prisma } from '../../src/db/client.js';
import { NotificationAlreadyExistsError } from '../../src/repositories/notification.repo.js';
import { PrismaNotificationRepo } from '../../src/repositories/prisma-notification.repo.js';
import { IDS, resetDatabase, seedPostVisitData } from './helpers/db.js';

<<<<<<< HEAD
// B5 · PrismaNotificationRepo contra Postgres real (INT-1 a INT-3).
// E4-02 · unique por destinataria (INT-3 reescrito, INT-E4-1 e INT-E4-2).
// E2-02 · findByProviderMessageId + updateStatus (INT-4, INT-5).
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
    const [row] = await prisma.$queryRaw<
      { current_database: string }[]
    >`SELECT current_database()`;
    expect(row?.current_database).toMatch(/_test$/);
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

  it('INT-3 · findRecipientIds: solo las destinatarias de esa incidencia y plantilla (E4-02)', async () => {
    expect(await repo.findRecipientIds(IDS.incident, 'post_visit')).toEqual([]);

    await repo.create({
      incidentId: IDS.incident,
      recipientId: IDS.tenant,
      template: 'otra_plantilla',
      status: 'QUEUED',
    });
    expect(await repo.findRecipientIds(IDS.incident, 'post_visit')).toEqual([]);

    await repo.create({
      incidentId: IDS.incident,
      recipientId: IDS.tenant,
      template: 'post_visit',
      status: 'FAILED',
      error: 'VonageNetworkError',
    });
    expect(await repo.findRecipientIds(IDS.incident, 'post_visit')).toEqual([IDS.tenant]);
  });

  it('INT-E4-1 · la unique por destinataria: el segundo create lanza NotificationAlreadyExistsError', async () => {
    await repo.create({
      incidentId: IDS.incident,
      recipientId: IDS.tenant,
      template: 'post_visit',
      status: 'QUEUED',
      providerMessageId: 'msg-1',
    });

    await expect(
      repo.create({
        incidentId: IDS.incident,
        recipientId: IDS.tenant,
        template: 'post_visit',
        status: 'QUEUED',
        providerMessageId: 'msg-2',
      }),
    ).rejects.toBeInstanceOf(NotificationAlreadyExistsError);
    expect(await prisma.notification.count()).toBe(1);
  });

  it('INT-E4-2 · un providerMessageId repetido no se confunde con la unique por destinataria', async () => {
    await repo.create({
      incidentId: IDS.incident,
      recipientId: IDS.tenant,
      template: 'post_visit',
      status: 'QUEUED',
      providerMessageId: 'msg-repetido',
    });

    const error = await repo
      .create({
        incidentId: IDS.incident,
        recipientId: IDS.manager,
        template: 'post_visit',
        status: 'QUEUED',
        providerMessageId: 'msg-repetido',
      })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(NotificationAlreadyExistsError);
  });

  it('INT-4 · E2-02: findByProviderMessageId encuentra por message_uuid y null si no existe', async () => {
    const created = await repo.create({
      incidentId: IDS.incident,
      recipientId: IDS.tenant,
      template: 'post_visit',
      status: 'QUEUED',
      providerMessageId: 'msg-e2-02',
      sentAt: new Date(),
    });

    expect((await repo.findByProviderMessageId('msg-e2-02'))?.id).toBe(created.id);
    expect(await repo.findByProviderMessageId('no-existe')).toBeNull();
  });

  it('INT-5 · E2-02: updateStatus guarda estado, deliveredAt y error sin tocar el resto', async () => {
    const created = await repo.create({
      incidentId: IDS.incident,
      recipientId: IDS.tenant,
      template: 'post_visit',
      status: 'QUEUED',
      providerMessageId: 'msg-e2-02',
      sentAt: new Date(),
    });
    const deliveredAt = new Date('2026-11-25T20:00:05.000Z');

    await repo.updateStatus(created.id, { status: 'DELIVERED', deliveredAt, error: null });
    const row = await prisma.notification.findUniqueOrThrow({ where: { id: created.id } });

    expect(row.status).toBe('DELIVERED');
    expect(row.deliveredAt).toEqual(deliveredAt);
    expect(row.error).toBeNull();
    expect(row.providerMessageId).toBe('msg-e2-02');
    expect(row.sentAt).toEqual(created.sentAt);
  });
});

import type { Notification } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import {
  InMemoryNotificationRepo,
  NotificationAlreadyExistsError,
} from '../repositories/notification.repo.js';

// B3 · InMemoryNotificationRepo — CA-9.
// Spec: specs/features/B3-notifications/02-specification.md

const now = new Date();

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'ntf_demo',
    incidentId: 'inc_demo',
    recipientId: 'usr_tenant_demo',
    channel: 'SMS',
    status: 'QUEUED',
    template: 'post_visit',
    providerMessageId: 'msg-1',
    error: null,
    sentAt: now,
    deliveredAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('InMemoryNotificationRepo', () => {
  it('E4-02 · findRecipientIds devuelve las destinatarias con registro de esa incidencia y plantilla', async () => {
    const repo = new InMemoryNotificationRepo([
      makeNotification({ id: 'a', incidentId: 'inc_otra' }),
      makeNotification({ id: 'b', template: 'otra_plantilla' }),
    ]);

    expect(await repo.findRecipientIds('inc_demo', 'post_visit')).toEqual([]);

    await repo.create({
      incidentId: 'inc_demo',
      recipientId: 'usr_tenant_demo',
      template: 'post_visit',
      status: 'FAILED',
      error: 'VonageNetworkError',
    });
    await repo.create({
      incidentId: 'inc_demo',
      recipientId: 'usr_manager_demo',
      template: 'post_visit',
      status: 'QUEUED',
    });

    expect(await repo.findRecipientIds('inc_demo', 'post_visit')).toEqual([
      'usr_tenant_demo',
      'usr_manager_demo',
    ]);
  });

  it('E4-02 · create con la misma incidencia + plantilla + destinataria lanza NotificationAlreadyExistsError', async () => {
    const repo = new InMemoryNotificationRepo([makeNotification()]);

    await expect(
      repo.create({
        incidentId: 'inc_demo',
        recipientId: 'usr_tenant_demo',
        template: 'post_visit',
        status: 'QUEUED',
      }),
    ).rejects.toBeInstanceOf(NotificationAlreadyExistsError);
    expect(repo.items).toHaveLength(1);
  });

  it('CA-9 · create rellena id, channel SMS, fechas y null en lo opcional', async () => {
    const repo = new InMemoryNotificationRepo();

    const created = await repo.create({
      incidentId: 'inc_demo',
      recipientId: 'usr_tenant_demo',
      template: 'post_visit',
      status: 'FAILED',
    });

    expect(created).toMatchObject({
      incidentId: 'inc_demo',
      recipientId: 'usr_tenant_demo',
      template: 'post_visit',
      status: 'FAILED',
      channel: 'SMS',
      providerMessageId: null,
      error: null,
      sentAt: null,
    });
    expect(created.id).toEqual(expect.any(String));
    expect(created.createdAt).toBeInstanceOf(Date);
    expect(repo.items).toHaveLength(1);
  });
});

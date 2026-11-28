import type { Notification, NotificationStatus } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import { InMemoryNotificationRepo } from '../repositories/notification.repo.js';
import {
  canTransition,
  NotificationStatusService,
} from '../services/notification-status.service.js';

// E2-02 · NotificationStatusService + repo en memoria (sin Postgres).
// Spec: specs/features/E2-02-notification-status/02-specification.md

const sentAt = new Date('2026-11-25T20:00:00.000Z');

function notification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'ntf_tenant',
    incidentId: 'inc_demo',
    recipientId: 'usr_tenant_demo',
    channel: 'SMS',
    status: 'QUEUED',
    template: 'post_visit',
    providerMessageId: 'msg-uuid-1',
    error: null,
    sentAt,
    deliveredAt: null,
    createdAt: sentAt,
    updatedAt: sentAt,
    ...overrides,
  };
}

function setup(overrides: Partial<Notification> = {}) {
  const repo = new InMemoryNotificationRepo([notification(overrides)]);
  const service = new NotificationStatusService(repo);
  const current = () => repo.items[0]!;
  return { repo, service, current };
}

describe('InMemoryNotificationRepo (E2-02)', () => {
  it('NS-R1 · findByProviderMessageId encuentra por message_uuid y null si no existe', async () => {
    const { repo } = setup();

    expect((await repo.findByProviderMessageId('msg-uuid-1'))?.id).toBe('ntf_tenant');
    expect(await repo.findByProviderMessageId('otro')).toBeNull();
  });

  it('NS-R2 · updateStatus solo cambia los campos que se pasan', async () => {
    const { repo, current } = setup({ error: 'antes' });

    await repo.updateStatus('ntf_tenant', { status: 'SUBMITTED' });

    expect(current().status).toBe('SUBMITTED');
    expect(current().error).toBe('antes');
    expect(current().deliveredAt).toBeNull();
  });
});

describe('NotificationStatusService.applyStatus (E2-02)', () => {
  it('NS-1 · submitted → SUBMITTED', async () => {
    const { service, current } = setup();

    const result = await service.applyStatus({ messageUuid: 'msg-uuid-1', status: 'submitted' });

    expect(result).toBe('processed');
    expect(current().status).toBe('SUBMITTED');
  });

  it.each(['delivered', 'read'])('NS-2 · %s → DELIVERED con deliveredAt = timestamp', async (status) => {
    const { service, current } = setup({ status: 'SUBMITTED' });

    const result = await service.applyStatus({
      messageUuid: 'msg-uuid-1',
      status,
      timestamp: '2026-11-25T20:00:05.000Z',
    });

    expect(result).toBe('processed');
    expect(current().status).toBe('DELIVERED');
    expect(current().deliveredAt).toEqual(new Date('2026-11-25T20:00:05.000Z'));
  });

  it('NS-3 · timestamp ilegible → deliveredAt = ahora', async () => {
    const { service, current } = setup();
    const before = Date.now();

    await service.applyStatus({ messageUuid: 'msg-uuid-1', status: 'delivered', timestamp: 'nope' });

    expect(current().deliveredAt!.getTime()).toBeGreaterThanOrEqual(before);
  });

  it.each(['rejected', 'undeliverable'])('NS-4 · %s → FAILED con el error de Vonage', async (status) => {
    const { service, current } = setup({ status: 'SUBMITTED' });

    const result = await service.applyStatus({
      messageUuid: 'msg-uuid-1',
      status,
      error: { title: 'Invalid number', detail: 'The number is not valid' },
    });

    expect(result).toBe('processed');
    expect(current().status).toBe('FAILED');
    expect(current().error).toBe('Invalid number: The number is not valid');
  });

  it('NS-5 · FAILED sin error de Vonage guarda el estado como texto', async () => {
    const { service, current } = setup();

    await service.applyStatus({ messageUuid: 'msg-uuid-1', status: 'undeliverable' });

    expect(current().error).toBe('undeliverable');
  });

  it('NS-6 · mismo estado repetido → already_processed sin cambios', async () => {
    const { service, current } = setup({ status: 'SUBMITTED' });

    const result = await service.applyStatus({ messageUuid: 'msg-uuid-1', status: 'submitted' });

    expect(result).toBe('already_processed');
    expect(current().updatedAt).toEqual(sentAt);
  });

  it('NS-7 · nunca retrocede: DELIVERED no baja a SUBMITTED ni a FAILED', async () => {
    const delivered = new Date('2026-11-25T20:00:05.000Z');
    const { service, current } = setup({ status: 'DELIVERED', deliveredAt: delivered });

    expect(await service.applyStatus({ messageUuid: 'msg-uuid-1', status: 'submitted' })).toBe(
      'already_processed',
    );
    expect(await service.applyStatus({ messageUuid: 'msg-uuid-1', status: 'rejected' })).toBe(
      'already_processed',
    );
    expect(current().status).toBe('DELIVERED');
    expect(current().deliveredAt).toEqual(delivered);
  });

  it('NS-8 · FAILED es terminal salvo un delivered posterior (que limpia el error)', async () => {
    const { service, current } = setup({ status: 'FAILED', error: 'Invalid number' });

    expect(await service.applyStatus({ messageUuid: 'msg-uuid-1', status: 'submitted' })).toBe(
      'already_processed',
    );
    expect(await service.applyStatus({ messageUuid: 'msg-uuid-1', status: 'delivered' })).toBe(
      'processed',
    );
    expect(current().status).toBe('DELIVERED');
    expect(current().error).toBeNull();
  });

  it('NS-9 · message_uuid desconocido → ignored', async () => {
    const { service, current } = setup();

    expect(await service.applyStatus({ messageUuid: 'no-existe', status: 'delivered' })).toBe(
      'ignored',
    );
    expect(current().status).toBe('QUEUED');
  });

  it('NS-10 · estado de Vonage que no conocemos → ignored', async () => {
    const { service, current } = setup();

    expect(await service.applyStatus({ messageUuid: 'msg-uuid-1', status: 'accepted' })).toBe(
      'ignored',
    );
    expect(current().status).toBe('QUEUED');
  });

  it('NS-11 · el estado de Vonage no distingue mayúsculas', async () => {
    const { service, current } = setup();

    await service.applyStatus({ messageUuid: 'msg-uuid-1', status: 'DELIVERED' });

    expect(current().status).toBe('DELIVERED');
  });
});

describe('canTransition (E2-02)', () => {
  const cases: [NotificationStatus, NotificationStatus, boolean][] = [
    ['QUEUED', 'SUBMITTED', true],
    ['QUEUED', 'DELIVERED', true],
    ['QUEUED', 'FAILED', true],
    ['SUBMITTED', 'DELIVERED', true],
    ['SUBMITTED', 'FAILED', true],
    ['SUBMITTED', 'QUEUED', false],
    ['DELIVERED', 'SUBMITTED', false],
    ['DELIVERED', 'FAILED', false],
    ['FAILED', 'SUBMITTED', false],
    ['FAILED', 'DELIVERED', true],
  ];

  it.each(cases)('%s → %s = %s', (from, to, expected) => {
    expect(canTransition(from, to)).toBe(expected);
  });
});

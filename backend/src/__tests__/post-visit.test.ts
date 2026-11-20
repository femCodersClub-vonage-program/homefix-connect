import type { User } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  InMemoryIncidentRepo,
  type IncidentWithRelations,
} from '../repositories/incident.repo.js';
import {
  buildPostVisitBody,
  type MessagingService,
  MessagingPostVisitNotifier,
} from '../services/messaging.service.js';

// B2 · sendPostVisit — tests unitarios (fase roja).
// Spec: specs/features/B2-send-sms/02-specification.md (CA-1 a CA-7).
// MessagingService mockeado e IncidentRepo en memoria: sin red ni Postgres.

const { logInfo, logWarn, logError } = vi.hoisted(() => ({
  logInfo: vi.fn(),
  logWarn: vi.fn(),
  logError: vi.fn(),
}));

vi.mock('../lib/logger.js', () => ({
  logger: { info: logInfo, warn: logWarn, error: logError, debug: vi.fn() },
}));

const TITLE = 'Fuga de agua en el baño';
const TECHNICIAN_NAME = 'Técnica Demo';
const EXPECTED_BODY =
  'Visita realizada para la incidencia «Fuga de agua en el baño» por Técnica Demo. Cuando el informe esté listo te notificaremos.';

const now = new Date();

function makeUser(id: string, name: string, phone: string, role: User['role']): User {
  return { id, name, phone, email: null, role, createdAt: now, updatedAt: now };
}

const TENANT = makeUser('usr_tenant_demo', 'Inquilina Demo', '+34600000001', 'TENANT');
const TECHNICIAN = makeUser('usr_technician_demo', TECHNICIAN_NAME, '+34600000002', 'TECHNICIAN');
const MANAGER = makeUser('usr_manager_demo', 'Gestora Demo', '+34600000003', 'MANAGER');

function makeIncident(
  overrides: Partial<IncidentWithRelations> = {},
): IncidentWithRelations {
  return {
    id: 'inc_demo',
    title: TITLE,
    description: null,
    status: 'VIDEO_COMPLETED',
    tenantId: TENANT.id,
    technicianId: TECHNICIAN.id,
    managerId: MANAGER.id,
    createdAt: now,
    updatedAt: now,
    technician: TECHNICIAN,
    tenant: TENANT,
    manager: MANAGER,
    visit: null,
    ...overrides,
  };
}

function makeMessaging(): MessagingService & { sendSms: ReturnType<typeof vi.fn> } {
  return {
    sendSms: vi
      .fn()
      .mockResolvedValueOnce({ providerMessageId: 'msg-gestora' })
      .mockResolvedValueOnce({ providerMessageId: 'msg-inquilina' }),
  };
}

function setup(incident: IncidentWithRelations = makeIncident()) {
  const messaging = makeMessaging();
  const incidentRepo = new InMemoryIncidentRepo([incident]);
  const notifier = new MessagingPostVisitNotifier({ messaging, incidentRepo });
  return { messaging, notifier };
}

beforeEach(() => {
  logInfo.mockClear();
  logWarn.mockClear();
  logError.mockClear();
});

describe('buildPostVisitBody', () => {
  it('CA-2 · sigue exactamente la plantilla post-visita', () => {
    expect(buildPostVisitBody(TITLE, TECHNICIAN_NAME)).toBe(EXPECTED_BODY);
  });
});

describe('MessagingPostVisitNotifier.sendPostVisit', () => {
  it('CA-1 · envía 2 SMS (gestora → inquilina) con la plantilla y devuelve sus ids', async () => {
    const { messaging, notifier } = setup();

    const result = await notifier.sendPostVisit('inc_demo', TECHNICIAN_NAME);

    expect(messaging.sendSms).toHaveBeenCalledTimes(2);
    expect(messaging.sendSms).toHaveBeenNthCalledWith(1, MANAGER.phone, EXPECTED_BODY);
    expect(messaging.sendSms).toHaveBeenNthCalledWith(2, TENANT.phone, EXPECTED_BODY);
    expect(result).toEqual({
      sent: [
        { recipientId: MANAGER.id, role: 'MANAGER', providerMessageId: 'msg-gestora' },
        { recipientId: TENANT.id, role: 'TENANT', providerMessageId: 'msg-inquilina' },
      ],
      failed: [],
      skipped: [],
    });
  });

  it('CA-3 · sin gestora: solo a la inquilina, la gestora en skipped y log warn', async () => {
    const { messaging, notifier } = setup(
      makeIncident({ managerId: null, manager: null }),
    );
    messaging.sendSms.mockReset().mockResolvedValue({ providerMessageId: 'msg-inquilina' });

    const result = await notifier.sendPostVisit('inc_demo', TECHNICIAN_NAME);

    expect(messaging.sendSms).toHaveBeenCalledTimes(1);
    expect(messaging.sendSms).toHaveBeenCalledWith(TENANT.phone, EXPECTED_BODY);
    expect(result).toEqual({
      sent: [{ recipientId: TENANT.id, role: 'TENANT', providerMessageId: 'msg-inquilina' }],
      failed: [],
      skipped: [{ role: 'MANAGER', reason: 'NO_MANAGER' }],
    });
    expect(logWarn).toHaveBeenCalled();
  });

  it('CA-4 · si falla el SMS de la gestora, se envía igual a la inquilina', async () => {
    const { messaging, notifier } = setup();
    messaging.sendSms
      .mockReset()
      .mockRejectedValueOnce(
        Object.assign(new Error('Vonage caído'), { name: 'VonageNetworkError' }),
      )
      .mockResolvedValueOnce({ providerMessageId: 'msg-inquilina' });

    const result = await notifier.sendPostVisit('inc_demo', TECHNICIAN_NAME);

    expect(messaging.sendSms).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      sent: [{ recipientId: TENANT.id, role: 'TENANT', providerMessageId: 'msg-inquilina' }],
      failed: [{ recipientId: MANAGER.id, role: 'MANAGER', error: 'VonageNetworkError' }],
      skipped: [],
    });
    expect(logError).toHaveBeenCalled();
  });

  it('CA-4 · si fallan los dos SMS, no lanza y los dos van en failed', async () => {
    const { messaging, notifier } = setup();
    messaging.sendSms
      .mockReset()
      .mockRejectedValue(Object.assign(new Error('x'), { name: 'VonageAuthError' }));

    const result = await notifier.sendPostVisit('inc_demo', TECHNICIAN_NAME);

    expect(result.sent).toEqual([]);
    expect(result.failed).toEqual([
      { recipientId: MANAGER.id, role: 'MANAGER', error: 'VonageAuthError' },
      { recipientId: TENANT.id, role: 'TENANT', error: 'VonageAuthError' },
    ]);
  });

  it('CA-5 · incidencia inexistente: lanza error y no envía nada', async () => {
    const { messaging, notifier } = setup();

    await expect(
      notifier.sendPostVisit('no-existe', TECHNICIAN_NAME),
    ).rejects.toThrow('no-existe');
    expect(messaging.sendSms).not.toHaveBeenCalled();
  });

  it('CA-6 · technicianName vacío: usa el nombre de la técnica de la incidencia', async () => {
    const { messaging, notifier } = setup();

    await notifier.sendPostVisit('inc_demo', '   ');

    expect(messaging.sendSms).toHaveBeenNthCalledWith(1, MANAGER.phone, EXPECTED_BODY);
  });

  it('CA-6 · technicianName vacío y sin técnica: lanza error y no envía nada', async () => {
    const { messaging, notifier } = setup(
      makeIncident({ technicianId: null, technician: null }),
    );

    await expect(notifier.sendPostVisit('inc_demo', '')).rejects.toThrow();
    expect(messaging.sendSms).not.toHaveBeenCalled();
  });

  it('CA-7 · los logs no llevan el texto del SMS ni teléfonos', async () => {
    const { messaging, notifier } = setup();
    messaging.sendSms
      .mockReset()
      .mockRejectedValueOnce(Object.assign(new Error('x'), { name: 'VonageNetworkError' }))
      .mockResolvedValueOnce({ providerMessageId: 'msg-inquilina' });

    await notifier.sendPostVisit('inc_demo', TECHNICIAN_NAME);

    const logged = JSON.stringify([
      ...logInfo.mock.calls,
      ...logWarn.mock.calls,
      ...logError.mock.calls,
    ]);
    expect(logInfo).toHaveBeenCalled();
    expect(logged).not.toContain(EXPECTED_BODY);
    expect(logged).not.toContain(TITLE);
    expect(logged).not.toContain('60000000');
  });
});

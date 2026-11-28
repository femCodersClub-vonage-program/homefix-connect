import type { Notification, User } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  InMemoryIncidentRepo,
  type IncidentWithRelations,
} from '../repositories/incident.repo.js';
import {
  InMemoryNotificationRepo,
  NotificationAlreadyExistsError,
} from '../repositories/notification.repo.js';
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

function setup(
  incident: IncidentWithRelations = makeIncident(),
  notifications: Notification[] = [],
) {
  const messaging = makeMessaging();
  const incidentRepo = new InMemoryIncidentRepo([incident]);
  const notificationRepo = new InMemoryNotificationRepo(notifications);
  const notifier = new MessagingPostVisitNotifier({
    messaging,
    incidentRepo,
    notificationRepo,
  });
  return { messaging, notifier, notificationRepo };
}

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'ntf_previa',
    incidentId: 'inc_demo',
    recipientId: TENANT.id,
    channel: 'SMS',
    status: 'QUEUED',
    template: 'post_visit',
    providerMessageId: 'msg-anterior',
    error: null,
    sentAt: now,
    deliveredAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
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

// B3 · Registros Notification + idempotencia (fase roja).
// Spec: specs/features/B3-notifications/02-specification.md (CA-1 a CA-8).
describe('MessagingPostVisitNotifier.sendPostVisit · Notification (B3)', () => {
  it('B3 CA-1 · crea 2 Notification QUEUED con template, recipientId, providerMessageId y sentAt', async () => {
    const { notifier, notificationRepo } = setup();

    await notifier.sendPostVisit('inc_demo', TECHNICIAN_NAME);

    expect(notificationRepo.items).toHaveLength(2);
    expect(notificationRepo.items).toEqual([
      expect.objectContaining({
        incidentId: 'inc_demo',
        recipientId: MANAGER.id,
        template: 'post_visit',
        channel: 'SMS',
        status: 'QUEUED',
        providerMessageId: 'msg-gestora',
        error: null,
        sentAt: expect.any(Date),
      }),
      expect.objectContaining({
        incidentId: 'inc_demo',
        recipientId: TENANT.id,
        template: 'post_visit',
        status: 'QUEUED',
        providerMessageId: 'msg-inquilina',
        sentAt: expect.any(Date),
      }),
    ]);
  });

  it('B3 CA-2 · ya enviado a las dos: no llama a sendSms, no crea nada y devuelve ALREADY_SENT', async () => {
    const { messaging, notifier, notificationRepo } = setup(makeIncident(), [
      makeNotification({ id: 'ntf_gestora', recipientId: MANAGER.id, providerMessageId: 'msg-g' }),
      makeNotification(),
    ]);

    const result = await notifier.sendPostVisit('inc_demo', TECHNICIAN_NAME);

    expect(messaging.sendSms).not.toHaveBeenCalled();
    expect(notificationRepo.items).toHaveLength(2);
    expect(result).toEqual({
      sent: [],
      failed: [],
      skipped: [
        { role: 'MANAGER', reason: 'ALREADY_SENT' },
        { role: 'TENANT', reason: 'ALREADY_SENT' },
      ],
    });
    expect(logInfo).toHaveBeenCalled();
  });

  it('B3 CA-2 · ya enviado y sin gestora: NO_MANAGER + la inquilina en ALREADY_SENT (E4-02)', async () => {
    const { messaging, notifier } = setup(makeIncident({ managerId: null, manager: null }), [
      makeNotification(),
    ]);

    const result = await notifier.sendPostVisit('inc_demo', TECHNICIAN_NAME);

    expect(messaging.sendSms).not.toHaveBeenCalled();
    expect(result.skipped).toEqual([
      { role: 'MANAGER', reason: 'NO_MANAGER' },
      { role: 'TENANT', reason: 'ALREADY_SENT' },
    ]);
  });

  it('B3 CA-3 · dos llamadas seguidas: 2 SMS en total y 2 Notification', async () => {
    const { messaging, notifier, notificationRepo } = setup();

    await notifier.sendPostVisit('inc_demo', TECHNICIAN_NAME);
    await notifier.sendPostVisit('inc_demo', TECHNICIAN_NAME);

    expect(messaging.sendSms).toHaveBeenCalledTimes(2);
    expect(notificationRepo.items).toHaveLength(2);
  });

  it('B3 CA-4 · falla el SMS de la gestora: su Notification en FAILED y la de la inquilina en QUEUED', async () => {
    const { messaging, notifier, notificationRepo } = setup();
    messaging.sendSms
      .mockReset()
      .mockRejectedValueOnce(
        Object.assign(new Error('Vonage caído'), { name: 'VonageNetworkError' }),
      )
      .mockResolvedValueOnce({ providerMessageId: 'msg-inquilina' });

    await notifier.sendPostVisit('inc_demo', TECHNICIAN_NAME);

    expect(notificationRepo.items).toEqual([
      expect.objectContaining({
        recipientId: MANAGER.id,
        status: 'FAILED',
        error: 'VonageNetworkError',
        providerMessageId: null,
        sentAt: null,
      }),
      expect.objectContaining({
        recipientId: TENANT.id,
        status: 'QUEUED',
        providerMessageId: 'msg-inquilina',
      }),
    ]);
  });

  it('B3 CA-5 · con una Notification FAILED previa a esa destinataria no se le reenvía (E4-02)', async () => {
    const { messaging, notifier } = setup(makeIncident(), [
      makeNotification({ status: 'FAILED', providerMessageId: null, sentAt: null, error: 'VonageNetworkError' }),
    ]);

    const result = await notifier.sendPostVisit('inc_demo', TECHNICIAN_NAME);

    expect(messaging.sendSms).toHaveBeenCalledTimes(1);
    expect(messaging.sendSms).toHaveBeenCalledWith(MANAGER.phone, EXPECTED_BODY);
    expect(result.skipped).toEqual([{ role: 'TENANT', reason: 'ALREADY_SENT' }]);
  });

  it('B3 CA-6 · sin gestora: solo la Notification de la inquilina y NO_MANAGER', async () => {
    const { messaging, notifier, notificationRepo } = setup(
      makeIncident({ managerId: null, manager: null }),
    );
    messaging.sendSms.mockReset().mockResolvedValue({ providerMessageId: 'msg-inquilina' });

    const result = await notifier.sendPostVisit('inc_demo', TECHNICIAN_NAME);

    expect(notificationRepo.items).toHaveLength(1);
    expect(notificationRepo.items[0]).toMatchObject({ recipientId: TENANT.id, status: 'QUEUED' });
    expect(result.skipped).toEqual([{ role: 'MANAGER', reason: 'NO_MANAGER' }]);
  });

  it('B3 CA-7 · incidencia inexistente: lanza, no envía ni crea nada', async () => {
    const { messaging, notifier, notificationRepo } = setup();

    await expect(notifier.sendPostVisit('no-existe', TECHNICIAN_NAME)).rejects.toThrow(
      'no-existe',
    );
    expect(messaging.sendSms).not.toHaveBeenCalled();
    expect(notificationRepo.items).toHaveLength(0);
  });

  it('B3 CA-8 · ni los logs ni Notification.error llevan teléfonos ni el texto del SMS', async () => {
    const { messaging, notifier, notificationRepo } = setup();
    messaging.sendSms
      .mockReset()
      .mockRejectedValueOnce(
        Object.assign(new Error(`falló ${MANAGER.phone}: ${EXPECTED_BODY}`), {
          name: 'VonageNetworkError',
        }),
      )
      .mockResolvedValueOnce({ providerMessageId: 'msg-inquilina' });

    await notifier.sendPostVisit('inc_demo', TECHNICIAN_NAME);

    const stored = JSON.stringify(notificationRepo.items.map((n) => n.error));
    const logged = JSON.stringify([
      ...logInfo.mock.calls,
      ...logWarn.mock.calls,
      ...logError.mock.calls,
    ]);
    expect(notificationRepo.items).toHaveLength(2);
    for (const text of [stored, logged]) {
      expect(text).not.toContain(TITLE);
      expect(text).not.toContain('60000000');
    }
  });
});

// E4-02 · Idempotencia por destinataria.
// Spec: specs/features/E4-02-notification-unique/02-specification.md
describe('MessagingPostVisitNotifier.sendPostVisit · E4-02', () => {
  it('E4-02 CA-1 · la gestora ya tiene registro: solo se envía a la inquilina', async () => {
    const { messaging, notifier, notificationRepo } = setup(makeIncident(), [
      makeNotification({ id: 'ntf_gestora', recipientId: MANAGER.id, providerMessageId: 'msg-g' }),
    ]);
    messaging.sendSms.mockReset().mockResolvedValue({ providerMessageId: 'msg-inquilina' });

    const result = await notifier.sendPostVisit('inc_demo', TECHNICIAN_NAME);

    expect(messaging.sendSms).toHaveBeenCalledTimes(1);
    expect(messaging.sendSms).toHaveBeenCalledWith(TENANT.phone, EXPECTED_BODY);
    expect(result).toEqual({
      sent: [{ recipientId: TENANT.id, role: 'TENANT', providerMessageId: 'msg-inquilina' }],
      failed: [],
      skipped: [{ role: 'MANAGER', reason: 'ALREADY_SENT' }],
    });
    expect(notificationRepo.items).toHaveLength(2);
  });

  it('E4-02 CA-2 · un registro de otra plantilla no cuenta', async () => {
    const { messaging, notifier } = setup(makeIncident(), [
      makeNotification({ template: 'otra_plantilla' }),
    ]);

    const result = await notifier.sendPostVisit('inc_demo', TECHNICIAN_NAME);

    expect(messaging.sendSms).toHaveBeenCalledTimes(2);
    expect(result.skipped).toEqual([]);
  });

  it('E4-02 CA-3 · P2002 al guardar (llamada concurrente): ALREADY_SENT, no lanza y deja un warn', async () => {
    const { messaging, notifier, notificationRepo } = setup();
    const create = vi.spyOn(notificationRepo, 'create');
    create.mockRejectedValueOnce(
      new NotificationAlreadyExistsError('inc_demo', 'post_visit', MANAGER.id),
    );

    const result = await notifier.sendPostVisit('inc_demo', TECHNICIAN_NAME);

    expect(messaging.sendSms).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      sent: [{ recipientId: TENANT.id, role: 'TENANT', providerMessageId: 'msg-inquilina' }],
      failed: [],
      skipped: [{ role: 'MANAGER', reason: 'ALREADY_SENT' }],
    });
    expect(logWarn).toHaveBeenCalledWith(
      expect.objectContaining({ recipientId: MANAGER.id, role: 'MANAGER' }),
      expect.stringContaining('already exists'),
    );
  });

  it('E4-02 CA-3 · P2002 al guardar un FAILED: ALREADY_SENT y no aparece en failed', async () => {
    const { messaging, notifier, notificationRepo } = setup();
    messaging.sendSms
      .mockReset()
      .mockRejectedValueOnce(Object.assign(new Error('x'), { name: 'VonageNetworkError' }))
      .mockResolvedValueOnce({ providerMessageId: 'msg-inquilina' });
    vi.spyOn(notificationRepo, 'create').mockRejectedValueOnce(
      new NotificationAlreadyExistsError('inc_demo', 'post_visit', MANAGER.id),
    );

    const result = await notifier.sendPostVisit('inc_demo', TECHNICIAN_NAME);

    expect(result.failed).toEqual([]);
    expect(result.skipped).toEqual([{ role: 'MANAGER', reason: 'ALREADY_SENT' }]);
  });

  it('E4-02 CA-4 · cualquier otro error al guardar se propaga', async () => {
    const { notifier, notificationRepo } = setup();
    vi.spyOn(notificationRepo, 'create').mockRejectedValueOnce(new Error('BD caída'));

    await expect(notifier.sendPostVisit('inc_demo', TECHNICIAN_NAME)).rejects.toThrow('BD caída');
  });

  it('E4-02 CA-5 · todas con registro: no exige el nombre de la técnica', async () => {
    const { messaging, notifier } = setup(
      makeIncident({ technicianId: null, technician: null }),
      [
        makeNotification({ id: 'ntf_gestora', recipientId: MANAGER.id, providerMessageId: 'msg-g' }),
        makeNotification(),
      ],
    );

    const result = await notifier.sendPostVisit('inc_demo', '');

    expect(messaging.sendSms).not.toHaveBeenCalled();
    expect(result.skipped).toHaveLength(2);
  });
});

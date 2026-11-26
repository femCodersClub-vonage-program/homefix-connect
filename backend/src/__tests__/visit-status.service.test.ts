import type {
  IncidentStatus,
  User,
  VideoSession,
  VideoSessionStatus,
  Visit,
  VisitStatus,
} from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  InMemoryIncidentRepo,
  type IncidentWithRelations,
} from '../repositories/incident.repo.js';
import type { PostVisitNotifier, PostVisitResult } from '../services/messaging.service.js';
import { VisitStatusService } from '../services/visit-status.service.js';

// E1-02 · VisitStatusService — tests unitarios (CA-1 a CA-9).
// Spec: specs/features/E1-02-visit-status/02-specification.md

vi.mock('../lib/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const NOW = new Date('2026-12-01T11:00:00Z');
const TECH_ID = 'usr_technician_demo';

type Options = {
  incidentStatus?: IncidentStatus;
  visitStatus?: VisitStatus | null;
  sessionStatus?: VideoSessionStatus | null;
  completedAt?: Date | null;
};

function user(id: string, role: User['role']): User {
  return { id, name: `${role} Demo`, phone: '+34600000000', email: null, role, createdAt: NOW, updatedAt: NOW };
}

function makeIncident({
  incidentStatus = 'VISIT_ASSIGNED',
  visitStatus = 'CONFIRMED',
  sessionStatus = 'ACTIVE',
  completedAt = null,
}: Options = {}): IncidentWithRelations {
  const videoSession: VideoSession | null = sessionStatus
    ? {
        id: 'vs_demo',
        visitId: 'visit_demo',
        vonageSessionId: 'vonage-demo',
        status: sessionStatus,
        startedAt: sessionStatus === 'PENDING' ? null : NOW,
        endedAt: null,
        createdAt: NOW,
        updatedAt: NOW,
      }
    : null;
  const visit: (Visit & { videoSession: VideoSession | null }) | null = visitStatus
    ? {
        id: 'visit_demo',
        incidentId: 'inc_demo',
        scheduledAt: NOW,
        status: visitStatus,
        completedAt,
        createdAt: NOW,
        updatedAt: NOW,
        videoSession,
      }
    : null;
  return {
    id: 'inc_demo',
    title: 'Fuga de agua en el baño',
    description: null,
    status: incidentStatus,
    tenantId: 'usr_tenant_demo',
    technicianId: TECH_ID,
    managerId: 'usr_manager_demo',
    createdAt: NOW,
    updatedAt: NOW,
    technician: user(TECH_ID, 'TECHNICIAN'),
    tenant: user('usr_tenant_demo', 'TENANT'),
    manager: user('usr_manager_demo', 'MANAGER'),
    visit,
  };
}

const SENT_BOTH: PostVisitResult = {
  sent: [
    { recipientId: 'usr_manager_demo', role: 'MANAGER', providerMessageId: 'm1' },
    { recipientId: 'usr_tenant_demo', role: 'TENANT', providerMessageId: 'm2' },
  ],
  failed: [],
  skipped: [],
};

function setup(options: Options = {}) {
  const incidentRepo = new InMemoryIncidentRepo([makeIncident(options)]);
  const notifier: PostVisitNotifier & { sendPostVisit: ReturnType<typeof vi.fn> } = {
    sendPostVisit: vi.fn().mockResolvedValue(SENT_BOTH),
  };
  const service = new VisitStatusService({
    incidentRepo,
    postVisitNotifier: notifier,
    now: () => NOW,
  });
  const change = (status: 'COMPLETED' | 'CANCELLED', userId = TECH_ID, role: 'TECHNICIAN' | 'TENANT' | 'MANAGER' = 'TECHNICIAN') =>
    service.change({ incidentId: 'inc_demo', userId, role, status });
  return { incidentRepo, notifier, service, change };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('VisitStatusService.change', () => {
  it('CA-1 · COMPLETED: visita COMPLETED + completedAt, incidencia VIDEO_COMPLETED y SMS', async () => {
    const { change, incidentRepo, notifier } = setup();

    const result = await change('COMPLETED');

    expect(result).toEqual({ kind: 'completed', notifications: { sent: 2, failed: 0, skipped: 0 } });
    expect(notifier.sendPostVisit).toHaveBeenCalledWith('inc_demo', '');
    const incident = await incidentRepo.findById('inc_demo');
    expect(incident?.status).toBe('VIDEO_COMPLETED');
    expect(incident?.visit).toMatchObject({ status: 'COMPLETED', completedAt: NOW });
  });

  it('CA-1 · COMPLETED con la sesión ya ENDED también vale', async () => {
    const { change } = setup({ sessionStatus: 'ENDED' });

    expect((await change('COMPLETED')).kind).toBe('completed');
  });

  it('CA-2 · CANCELLED: visita CANCELLED sin completedAt, incidencia VISIT_ASSIGNED y sin SMS', async () => {
    const { change, incidentRepo, notifier } = setup();

    const result = await change('CANCELLED');

    expect(result).toEqual({ kind: 'not_completed' });
    expect(notifier.sendPostVisit).not.toHaveBeenCalled();
    const incident = await incidentRepo.findById('inc_demo');
    expect(incident?.status).toBe('VISIT_ASSIGNED');
    expect(incident?.visit).toMatchObject({ status: 'CANCELLED', completedAt: null });
  });

  it('CA-3 · corrección COMPLETED → CANCELLED: borra completedAt y vuelve a VISIT_ASSIGNED', async () => {
    const { change, incidentRepo } = setup({
      incidentStatus: 'VIDEO_COMPLETED',
      visitStatus: 'COMPLETED',
      completedAt: NOW,
    });

    expect(await change('CANCELLED')).toEqual({ kind: 'not_completed' });
    const incident = await incidentRepo.findById('inc_demo');
    expect(incident?.status).toBe('VISIT_ASSIGNED');
    expect(incident?.visit?.completedAt).toBeNull();
  });

  it('CA-3 · corrección CANCELLED → COMPLETED: vuelve a llamar a sendPostVisit (E4-02 evita duplicados)', async () => {
    const { change, notifier } = setup({ visitStatus: 'CANCELLED' });
    notifier.sendPostVisit.mockResolvedValue({
      sent: [],
      failed: [],
      skipped: [
        { role: 'MANAGER', reason: 'ALREADY_SENT' },
        { role: 'TENANT', reason: 'ALREADY_SENT' },
      ],
    });

    expect(await change('COMPLETED')).toEqual({
      kind: 'completed',
      notifications: { sent: 0, failed: 0, skipped: 2 },
    });
  });

  it('CA-4 · mismo estado: unchanged, sin tocar nada ni enviar SMS', async () => {
    const { change, incidentRepo, notifier } = setup({
      incidentStatus: 'VIDEO_COMPLETED',
      visitStatus: 'COMPLETED',
      completedAt: NOW,
    });
    const update = vi.spyOn(incidentRepo, 'updateVisitOutcome');

    expect(await change('COMPLETED')).toEqual({ kind: 'unchanged' });
    expect(update).not.toHaveBeenCalled();
    expect(notifier.sendPostVisit).not.toHaveBeenCalled();
  });

  it('CA-5 · un SMS falla: la visita queda COMPLETED y el resumen lo cuenta en failed', async () => {
    const { change, incidentRepo, notifier } = setup();
    notifier.sendPostVisit.mockResolvedValue({
      sent: [{ recipientId: 'usr_tenant_demo', role: 'TENANT', providerMessageId: 'm2' }],
      failed: [{ recipientId: 'usr_manager_demo', role: 'MANAGER', error: 'VonageNetworkError' }],
      skipped: [],
    });

    expect(await change('COMPLETED')).toEqual({
      kind: 'completed',
      notifications: { sent: 1, failed: 1, skipped: 0 },
    });
    expect((await incidentRepo.findById('inc_demo'))?.visit?.status).toBe('COMPLETED');
  });

  it('CA-5 · sendPostVisit lanza: la visita queda COMPLETED y no hay resumen (Q4)', async () => {
    const { change, incidentRepo, notifier } = setup();
    notifier.sendPostVisit.mockRejectedValue(new Error('BD caída'));

    expect(await change('COMPLETED')).toEqual({ kind: 'completed' });
    expect((await incidentRepo.findById('inc_demo'))?.visit?.status).toBe('COMPLETED');
  });

  it('CA-6 · 403 si el rol no es TECHNICIAN o es otra técnica', async () => {
    const { change } = setup();

    expect(await change('COMPLETED', 'usr_tenant_demo', 'TENANT')).toEqual({ kind: 'forbidden' });
    expect(await change('COMPLETED', 'usr_manager_demo', 'MANAGER')).toEqual({ kind: 'forbidden' });
    expect(await change('COMPLETED', 'usr_otra_tecnica', 'TECHNICIAN')).toEqual({ kind: 'forbidden' });
  });

  it('CA-7 · 404 si la incidencia no existe', async () => {
    const { service } = setup();

    expect(
      await service.change({ incidentId: 'inc_x', userId: TECH_ID, role: 'TECHNICIAN', status: 'COMPLETED' }),
    ).toEqual({ kind: 'not_found' });
  });

  it('CA-8 · 409 si la incidencia está CLOSED (también para corregir)', async () => {
    const { change, notifier } = setup({
      incidentStatus: 'CLOSED',
      visitStatus: 'COMPLETED',
      completedAt: NOW,
    });

    expect(await change('CANCELLED')).toEqual({ kind: 'closed' });
    expect(notifier.sendPostVisit).not.toHaveBeenCalled();
  });

  it('CA-9 · 409 sin sesión de vídeo, con la sesión PENDING o sin visita', async () => {
    expect(await setup({ sessionStatus: null }).change('COMPLETED')).toEqual({ kind: 'no_video_session' });
    expect(await setup({ sessionStatus: 'PENDING' }).change('COMPLETED')).toEqual({ kind: 'no_video_session' });
    expect(
      await setup({ incidentStatus: 'REPORTED', visitStatus: null, sessionStatus: null }).change('COMPLETED'),
    ).toEqual({ kind: 'no_video_session' });
  });

  it('CA-9 · 409 si la visita sigue PENDING', async () => {
    expect(await setup({ visitStatus: 'PENDING' }).change('COMPLETED')).toEqual({
      kind: 'visit_not_confirmed',
    });
  });
});

import type { IncidentStatus, User, Visit, VisitStatus } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';

import {
  InMemoryIncidentRepo,
  type IncidentWithRelations,
} from '../repositories/incident.repo.js';
import { CloseIncidentService } from '../services/close-incident.service.js';

// E3-02 · CloseIncidentService — tests unitarios (CA-1 a CA-6).
// Spec: specs/features/E3-02-close-incident/02-specification.md

vi.mock('../lib/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const NOW = new Date('2026-12-01T11:00:00Z');
const MANAGER_ID = 'usr_manager_demo';

const user = (id: string, role: User['role']): User => ({
  id, name: `${role} Demo`, phone: '+34600000000', email: null, role, createdAt: NOW, updatedAt: NOW,
});

function makeIncident(
  status: IncidentStatus = 'VIDEO_COMPLETED',
  visitStatus: VisitStatus | null = 'COMPLETED',
  managerId: string | null = MANAGER_ID,
): IncidentWithRelations {
  const visit: (Visit & { videoSession: null }) | null = visitStatus
    ? {
        id: 'visit_demo', incidentId: 'inc_demo', scheduledAt: NOW, status: visitStatus,
        completedAt: visitStatus === 'COMPLETED' ? NOW : null, createdAt: NOW, updatedAt: NOW,
        videoSession: null,
      }
    : null;
  return {
    id: 'inc_demo', title: 'Fuga', description: null, status,
    tenantId: 'usr_tenant_demo', technicianId: 'usr_technician_demo', managerId,
    createdAt: NOW, updatedAt: NOW,
    technician: user('usr_technician_demo', 'TECHNICIAN'), tenant: user('usr_tenant_demo', 'TENANT'),
    manager: managerId ? user(managerId, 'MANAGER') : null, visit,
  };
}

function setup(incident = makeIncident()) {
  const repo = new InMemoryIncidentRepo([incident]);
  const service = new CloseIncidentService(repo);
  const close = (userId = MANAGER_ID, role: 'TENANT' | 'TECHNICIAN' | 'MANAGER' = 'MANAGER', incidentId = 'inc_demo') =>
    service.close({ incidentId, userId, role });
  return { repo, close };
}

describe('CloseIncidentService.close', () => {
  it('CA-1 · gestora asignada + visita COMPLETED + VIDEO_COMPLETED → closed y la incidencia queda CLOSED', async () => {
    const { repo, close } = setup();

    expect(await close()).toEqual({ kind: 'closed' });
    expect((await repo.findById('inc_demo'))?.status).toBe('CLOSED');
  });

  it('CA-2 · ya cerrada → already_closed sin tocar nada', async () => {
    const { repo, close } = setup(makeIncident('CLOSED'));
    const spy = vi.spyOn(repo, 'closeIfReportReady');

    expect(await close()).toEqual({ kind: 'already_closed' });
    expect(spy).not.toHaveBeenCalled();
  });

  it.each([
    ['visita CANCELLED', makeIncident('VISIT_ASSIGNED', 'CANCELLED')],
    ['visita CONFIRMED', makeIncident('VISIT_ASSIGNED', 'CONFIRMED')],
    ['sin visita', makeIncident('REPORTED', null)],
    ['VIDEO_COMPLETED pero visita CONFIRMED (fallback antiguo)', makeIncident('VIDEO_COMPLETED', 'CONFIRMED')],
  ])('CA-3 · 409 report_not_ready: %s', async (_name, incident) => {
    const { repo, close } = setup(incident);

    expect(await close()).toEqual({ kind: 'report_not_ready' });
    expect((await repo.findById('inc_demo'))?.status).toBe(incident.status);
  });

  it.each([
    ['inquilina', 'usr_tenant_demo', 'TENANT'],
    ['técnica', 'usr_technician_demo', 'TECHNICIAN'],
    ['otra gestora', 'usr_otra_gestora', 'MANAGER'],
    ['id de la gestora con otro rol', MANAGER_ID, 'TECHNICIAN'],
  ] as const)('CA-4 · 403 forbidden: %s', async (_name, userId, role) => {
    const { close } = setup();

    expect(await close(userId, role)).toEqual({ kind: 'forbidden' });
  });

  it('CA-4 · 403 si la incidencia no tiene gestora', async () => {
    const { close } = setup(makeIncident('VIDEO_COMPLETED', 'COMPLETED', null));

    expect(await close()).toEqual({ kind: 'forbidden' });
  });

  it('CA-5 · 404 not_found', async () => {
    const { close } = setup();

    expect(await close(MANAGER_ID, 'MANAGER', 'inc_x')).toEqual({ kind: 'not_found' });
  });

  it('CA-6 · si cambia entre la lectura y el UPDATE: cerrada por otra petición → already_closed', async () => {
    const { repo, close } = setup();
    vi.spyOn(repo, 'closeIfReportReady').mockImplementationOnce(async () => {
      await repo.updateStatus('inc_demo', 'CLOSED');
      return false;
    });

    expect(await close()).toEqual({ kind: 'already_closed' });
  });

  it('CA-6 · si cambia entre la lectura y el UPDATE: la técnica la corrigió → report_not_ready', async () => {
    const { repo, close } = setup();
    vi.spyOn(repo, 'closeIfReportReady').mockImplementationOnce(async () => {
      await repo.updateVisitOutcome('inc_demo', {
        visitStatus: 'CANCELLED', completedAt: null, incidentStatus: 'VISIT_ASSIGNED',
      });
      return false;
    });

    expect(await close()).toEqual({ kind: 'report_not_ready' });
  });
});

import type { User, VideoSession, Visit } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import {
  InMemoryIncidentRepo,
  type IncidentRepo,
  type IncidentWithRelations,
} from '../repositories/incident.repo.js';
import {
  InMemoryMessagingService,
  type MessagingService,
} from '../services/messaging.service.js';
import {
  InMemoryVideoService,
  type VideoService,
} from '../services/video.service.js';

function makeIncident(
  overrides: Partial<IncidentWithRelations> = {},
): IncidentWithRelations {
  const now = new Date();

  const technician: User = {
    id: 'usr_technician_demo',
    name: 'Técnica Demo',
    phone: '+34600000002',
    email: null,
    role: 'TECHNICIAN',
    createdAt: now,
    updatedAt: now,
  };

  const videoSession: VideoSession = {
    id: 'vs_demo',
    visitId: 'visit_demo',
    vonageSessionId: null,
    status: 'PENDING',
    startedAt: null,
    endedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  const visit: Visit & { videoSession: VideoSession | null } = {
    id: 'visit_demo',
    incidentId: 'inc_demo',
    scheduledAt: now,
    status: 'CONFIRMED',
    createdAt: now,
    updatedAt: now,
    videoSession,
  };

  return {
    id: 'inc_demo',
    title: 'Fuga de agua en el baño',
    description: null,
    status: 'VISIT_ASSIGNED',
    tenantId: 'usr_tenant_demo',
    technicianId: technician.id,
    managerId: null,
    createdAt: now,
    updatedAt: now,
    technician,
    visit,
    ...overrides,
  };
}

describe('InMemoryVideoService', () => {
  it('cumple el contrato VideoService y crea una sesión con id', async () => {
    const service: VideoService = new InMemoryVideoService();

    const result = await service.createSession('visit_demo');

    expect(result.sessionId).toEqual(expect.any(String));
    expect(result.sessionId).not.toBe('');
  });

  it('genera un token con caducidad futura', async () => {
    const service: VideoService = new InMemoryVideoService();
    const { sessionId } = await service.createSession('visit_demo');

    const result = await service.generateToken(sessionId, 'TENANT');

    expect(result.token).toEqual(expect.any(String));
    expect(result.expiresAt).toBeInstanceOf(Date);
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });
});

describe('InMemoryMessagingService', () => {
  it('cumple el contrato MessagingService y devuelve un providerMessageId', async () => {
    const service: MessagingService = new InMemoryMessagingService();

    const result = await service.sendSms('+34600000001', 'Visita realizada');

    expect(result.providerMessageId).toEqual(expect.any(String));
    expect(result.providerMessageId).not.toBe('');
  });
});

describe('InMemoryIncidentRepo', () => {
  it('cumple el contrato IncidentRepo y encuentra una incidencia por id', async () => {
    const repo: IncidentRepo = new InMemoryIncidentRepo([makeIncident()]);

    const result = await repo.findById('inc_demo');

    expect(result).toMatchObject({ id: 'inc_demo', status: 'VISIT_ASSIGNED' });
  });

  it('devuelve null cuando la incidencia no existe', async () => {
    const repo = new InMemoryIncidentRepo();

    await expect(repo.findById('no-existe')).resolves.toBeNull();
  });

  it('actualiza el estado de una incidencia existente', async () => {
    const repo = new InMemoryIncidentRepo([makeIncident()]);

    const updated = await repo.updateStatus('inc_demo', 'VIDEO_COMPLETED');

    expect(updated.status).toBe('VIDEO_COMPLETED');
    await expect(repo.findById('inc_demo')).resolves.toMatchObject({
      status: 'VIDEO_COMPLETED',
    });
  });
});

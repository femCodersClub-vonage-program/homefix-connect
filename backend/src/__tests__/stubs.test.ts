import type { User, VideoSession, Visit } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import {
  InMemoryIncidentRepo,
  type IncidentRepo,
  type IncidentWithRelations,
} from '../repositories/incident.repo.js';
import {
  InMemoryVideoSessionRepo,
  type VideoSessionRepo,
  type VideoSessionWithVisit,
} from '../repositories/video-session.repo.js';
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

function makeVideoSession(
  overrides: Partial<VideoSessionWithVisit> = {},
): VideoSessionWithVisit {
  const now = new Date();

  const visit: Visit = {
    id: 'visit_demo',
    incidentId: 'inc_demo',
    scheduledAt: now,
    status: 'CONFIRMED',
    createdAt: now,
    updatedAt: now,
  };

  return {
    id: 'vs_demo',
    visitId: 'visit_demo',
    vonageSessionId: null,
    status: 'PENDING',
    startedAt: null,
    endedAt: null,
    createdAt: now,
    updatedAt: now,
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

describe('InMemoryVideoSessionRepo', () => {
  it('cumple el contrato VideoSessionRepo y encuentra la sesión por visitId', async () => {
    const repo: VideoSessionRepo = new InMemoryVideoSessionRepo([
      makeVideoSession(),
    ]);

    await expect(repo.findByVisitId('visit_demo')).resolves.toMatchObject({
      id: 'vs_demo',
      status: 'PENDING',
    });
  });

  it('encuentra la sesión por vonageSessionId con su visita', async () => {
    const repo = new InMemoryVideoSessionRepo([
      makeVideoSession({ vonageSessionId: 'vonage_session_demo' }),
    ]);

    const result = await repo.findByVonageSessionId('vonage_session_demo');

    expect(result).toMatchObject({
      id: 'vs_demo',
      visit: { incidentId: 'inc_demo' },
    });
  });

  it('devuelve null cuando no encuentra la sesión', async () => {
    const repo = new InMemoryVideoSessionRepo();

    await expect(repo.findByVisitId('no-existe')).resolves.toBeNull();
    await expect(
      repo.findByVonageSessionId('no-existe'),
    ).resolves.toBeNull();
  });

  it('guarda el vonageSessionId y activa la sesión', async () => {
    const repo = new InMemoryVideoSessionRepo([makeVideoSession()]);
    const startedAt = new Date();

    const updated = await repo.update('vs_demo', {
      vonageSessionId: 'vonage_session_demo',
      status: 'ACTIVE',
      startedAt,
    });

    expect(updated).toMatchObject({
      vonageSessionId: 'vonage_session_demo',
      status: 'ACTIVE',
      startedAt,
    });
    await expect(repo.findByVisitId('visit_demo')).resolves.toMatchObject({
      vonageSessionId: 'vonage_session_demo',
      status: 'ACTIVE',
    });
  });

  it('cierra la sesión sin borrar el vonageSessionId', async () => {
    const repo = new InMemoryVideoSessionRepo([
      makeVideoSession({
        vonageSessionId: 'vonage_session_demo',
        status: 'ACTIVE',
      }),
    ]);

    const updated = await repo.update('vs_demo', {
      status: 'ENDED',
      endedAt: new Date(),
    });

    expect(updated).toMatchObject({
      vonageSessionId: 'vonage_session_demo',
      status: 'ENDED',
    });
  });

  it('lanza error al actualizar una sesión inexistente', async () => {
    const repo = new InMemoryVideoSessionRepo();

    await expect(repo.update('no-existe', { status: 'ENDED' })).rejects.toThrow(
      'VideoSession no-existe not found',
    );
  });
});

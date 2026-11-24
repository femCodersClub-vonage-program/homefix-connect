import type { PrismaClient, VideoSessionStatus } from '@prisma/client';
import { vi } from 'vitest';

import { createApp } from '../../../src/app.js';
import { prisma } from '../../../src/db/client.js';
import { PrismaIncidentRepo } from '../../../src/repositories/prisma-incident.repo.js';
import { PrismaNotificationRepo } from '../../../src/repositories/prisma-notification.repo.js';
import {
  MessagingPostVisitNotifier,
  type MessagingService,
} from '../../../src/services/messaging.service.js';
import type { VideoService } from '../../../src/services/video.service.js';
import { TEST_SECRET } from '../../../src/__tests__/helpers/vonageJwt.js';
import { IDS } from './db.js';

// A5 · Seed y app de los tests de integración de vídeo. Sin Vonage real.

export const VIDEO_IDS = {
  visit: 'visit_demo',
  videoSession: 'vs_demo',
  vonageSession: 'vonage-session-demo',
  applicationId: 'app-test',
} as const;

type SeedVideoOptions = {
  /** Estado de la VideoSession (por defecto PENDING, sin sala de Vonage). */
  sessionStatus?: VideoSessionStatus;
  /** Si se pasa, la sala de Vonage ya existe. */
  vonageSessionId?: string | null;
};

/** Inquilina, técnica, gestora e incidencia VISIT_ASSIGNED con visita CONFIRMED y VideoSession. */
export async function seedVideoVisitData(
  db: PrismaClient,
  { sessionStatus = 'PENDING', vonageSessionId = null }: SeedVideoOptions = {},
): Promise<void> {
  await db.user.createMany({
    data: [
      { id: IDS.tenant, name: 'Inquilina Demo', phone: '+34600000001', role: 'TENANT' },
      { id: IDS.technician, name: 'Técnica Demo', phone: '+34600000002', role: 'TECHNICIAN' },
      { id: IDS.manager, name: 'Gestora Demo', phone: '+34600000003', role: 'MANAGER' },
    ],
  });
  await db.incident.create({
    data: {
      id: IDS.incident,
      title: 'Fuga de agua en el baño',
      status: 'VISIT_ASSIGNED',
      tenantId: IDS.tenant,
      technicianId: IDS.technician,
      managerId: IDS.manager,
      visit: {
        create: {
          id: VIDEO_IDS.visit,
          scheduledAt: new Date('2026-12-01T10:00:00Z'),
          status: 'CONFIRMED',
          videoSession: {
            create: {
              id: VIDEO_IDS.videoSession,
              status: sessionStatus,
              vonageSessionId,
              startedAt: sessionStatus === 'PENDING' ? null : new Date(),
            },
          },
        },
      },
    },
  });
}

/** VideoService falso: devuelve siempre la misma sala y un token por rol. */
export function fakeVideoService() {
  return {
    createSession: vi.fn(async () => ({ sessionId: VIDEO_IDS.vonageSession })),
    generateToken: vi.fn(async (sessionId: string, role: string) => ({
      token: `token-${role}-${sessionId}`,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    })),
  } satisfies VideoService;
}

/** MessagingService falso: cada SMS «sale» con un id distinto. */
export function fakeMessaging() {
  let n = 0;
  return {
    sendSms: vi.fn(async () => ({ providerMessageId: `msg-${++n}` })),
  } satisfies MessagingService;
}

/**
 * App real (rutas + repos Prisma por defecto) con lo externo sustituido:
 * Vonage Video, Vonage Messages y el secreto de firma de webhooks.
 */
export function createVideoTestApp({
  videoService = fakeVideoService(),
  messaging = fakeMessaging(),
}: {
  videoService?: VideoService;
  messaging?: MessagingService;
} = {}) {
  const app = createApp({
    videoService,
    applicationId: VIDEO_IDS.applicationId,
    getSignatureSecret: () => TEST_SECRET,
    postVisitNotifier: new MessagingPostVisitNotifier({
      messaging,
      incidentRepo: new PrismaIncidentRepo(prisma),
      notificationRepo: new PrismaNotificationRepo(prisma),
    }),
  });
  return { app, videoService, messaging };
}

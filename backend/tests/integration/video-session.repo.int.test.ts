import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { prisma } from '../../src/db/client.js';
import { PrismaVideoSessionRepo } from '../../src/repositories/prisma-video-session.repo.js';
import { IDS, resetDatabase } from './helpers/db.js';
import { seedVideoVisitData, VIDEO_IDS } from './helpers/video.js';

// A5 · PrismaVideoSessionRepo contra Postgres real (INT-V1 a INT-V4).
// Spec: specs/features/A5-video-tests/02-specification.md

const repo = new PrismaVideoSessionRepo(prisma);

beforeEach(async () => {
  await resetDatabase(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('PrismaVideoSessionRepo (integración)', () => {
  it('INT-V1 · findByVisitId devuelve la sesión de la visita, o null si no hay', async () => {
    await seedVideoVisitData(prisma);

    const found = await repo.findByVisitId(VIDEO_IDS.visit);
    const missing = await repo.findByVisitId('visit_no_existe');

    expect(found).toMatchObject({ id: VIDEO_IDS.videoSession, status: 'PENDING', vonageSessionId: null });
    expect(missing).toBeNull();
  });

  it('INT-V2 · findByVonageSessionId incluye la visita (y su incidentId), o null si no existe', async () => {
    await seedVideoVisitData(prisma, { sessionStatus: 'ACTIVE', vonageSessionId: VIDEO_IDS.vonageSession });

    const found = await repo.findByVonageSessionId(VIDEO_IDS.vonageSession);
    const missing = await repo.findByVonageSessionId('vonage-desconocida');

    expect(found?.id).toBe(VIDEO_IDS.videoSession);
    expect(found?.visit).toMatchObject({ id: VIDEO_IDS.visit, incidentId: IDS.incident });
    expect(missing).toBeNull();
  });

  it('INT-V3 · update guarda solo los campos que se pasan', async () => {
    await seedVideoVisitData(prisma);
    const startedAt = new Date('2026-12-01T10:01:00Z');

    await repo.update(VIDEO_IDS.videoSession, { vonageSessionId: VIDEO_IDS.vonageSession });
    await repo.update(VIDEO_IDS.videoSession, { status: 'ACTIVE', startedAt });

    const row = await prisma.videoSession.findUniqueOrThrow({ where: { id: VIDEO_IDS.videoSession } });
    expect(row).toMatchObject({
      vonageSessionId: VIDEO_IDS.vonageSession,
      status: 'ACTIVE',
      startedAt,
      endedAt: null,
    });
  });

  it('INT-V4 · update de una sesión que no existe lanza error y no crea filas', async () => {
    await seedVideoVisitData(prisma);

    await expect(repo.update('vs_no_existe', { status: 'ENDED' })).rejects.toThrow();
    expect(await prisma.videoSession.count()).toBe(1);
  });
});

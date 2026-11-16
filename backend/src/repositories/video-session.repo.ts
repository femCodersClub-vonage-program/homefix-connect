import type { Prisma, VideoSession, VideoSessionStatus } from '@prisma/client';

export type VideoSessionWithVisit = Prisma.VideoSessionGetPayload<{
  include: { visit: true };
}>;

export type VideoSessionUpdate = {
  vonageSessionId?: string | null;
  status?: VideoSessionStatus;
  startedAt?: Date | null;
  endedAt?: Date | null;
};

export interface VideoSessionRepo {
  findByVisitId(visitId: string): Promise<VideoSession | null>;
  findByVonageSessionId(
    vonageSessionId: string,
  ): Promise<VideoSessionWithVisit | null>;
  update(id: string, data: VideoSessionUpdate): Promise<VideoSession>;
}

/**
 * Stub en memoria: no toca Postgres. Lo usan A1 (guardar `vonageSessionId`),
 * A3 (pasar a `ACTIVE`) y A4 (buscar por `vonageSessionId` y cerrar la sesión).
 */
export class InMemoryVideoSessionRepo implements VideoSessionRepo {
  private readonly sessions = new Map<string, VideoSessionWithVisit>();

  constructor(seed: VideoSessionWithVisit[] = []) {
    for (const session of seed) {
      this.sessions.set(session.id, session);
    }
  }

  async findByVisitId(visitId: string): Promise<VideoSession | null> {
    for (const session of this.sessions.values()) {
      if (session.visitId === visitId) {
        return session;
      }
    }

    return null;
  }

  async findByVonageSessionId(
    vonageSessionId: string,
  ): Promise<VideoSessionWithVisit | null> {
    for (const session of this.sessions.values()) {
      if (session.vonageSessionId === vonageSessionId) {
        return session;
      }
    }

    return null;
  }

  async update(id: string, data: VideoSessionUpdate): Promise<VideoSession> {
    const session = this.sessions.get(id);

    if (!session) {
      throw new Error(`VideoSession ${id} not found`);
    }

    const updated: VideoSessionWithVisit = { ...session, updatedAt: new Date() };
    if (data.vonageSessionId !== undefined) updated.vonageSessionId = data.vonageSessionId;
    if (data.status !== undefined) updated.status = data.status;
    if (data.startedAt !== undefined) updated.startedAt = data.startedAt;
    if (data.endedAt !== undefined) updated.endedAt = data.endedAt;
    this.sessions.set(id, updated);
    return updated;
  }
}

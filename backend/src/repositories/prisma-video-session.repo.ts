import type { PrismaClient, VideoSession } from "@prisma/client";

import type {
  VideoSessionRepo,
  VideoSessionUpdate,
  VideoSessionWithVisit,
} from "./video-session.repo.js";

export class PrismaVideoSessionRepo implements VideoSessionRepo {
  private readonly prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  findByVisitId(visitId: string): Promise<VideoSession | null> {
    return this.prisma.videoSession.findUnique({ where: { visitId } });
  }

  findByVonageSessionId(
    vonageSessionId: string,
  ): Promise<VideoSessionWithVisit | null> {
    return this.prisma.videoSession.findFirst({
      where: { vonageSessionId },
      include: { visit: true },
    });
  }

  update(id: string, data: VideoSessionUpdate): Promise<VideoSession> {
    return this.prisma.videoSession.update({ where: { id }, data });
  }
}

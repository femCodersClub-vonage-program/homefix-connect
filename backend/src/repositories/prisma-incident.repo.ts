import type {
    Incident,
    IncidentStatus,
    PrismaClient,
    VideoSession,
} from "@prisma/client";

import type {
    IncidentRepo,
    IncidentWithRelations,
    VideoSessionUpdate,
} from "./incident.repo.js";

export class PrismaIncidentRepo implements IncidentRepo {
  private readonly prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  findById(id: string): Promise<IncidentWithRelations | null> {
    return this.prisma.incident.findUnique({
      where: { id },
      include: { technician: true, visit: { include: { videoSession: true } } },
    });
  }

  updateStatus(id: string, status: IncidentStatus): Promise<Incident> {
    return this.prisma.incident.update({ where: { id }, data: { status } });
  }

  updateVideoSession(
    videoSessionId: string,
    data: VideoSessionUpdate,
  ): Promise<VideoSession> {
    return this.prisma.videoSession.update({
      where: { id: videoSessionId },
      data,
    });
  }
}

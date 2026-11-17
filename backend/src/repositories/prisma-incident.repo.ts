import type { Incident, IncidentStatus, PrismaClient } from "@prisma/client";

import type {
  IncidentRepo,
  IncidentWithRelations,
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
}

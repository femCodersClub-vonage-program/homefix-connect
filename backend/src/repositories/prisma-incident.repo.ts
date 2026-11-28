import type { Incident, IncidentStatus, PrismaClient } from "@prisma/client";

import type {
  IncidentRepo,
  IncidentWithRelations,
  VisitOutcome,
} from "./incident.repo.js";

export class PrismaIncidentRepo implements IncidentRepo {
  private readonly prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  findById(id: string): Promise<IncidentWithRelations | null> {
    return this.prisma.incident.findUnique({
      where: { id },
      include: {
        technician: true,
        tenant: true,
        manager: true,
        visit: { include: { videoSession: true } },
      },
    });
  }

  updateStatus(id: string, status: IncidentStatus): Promise<Incident> {
    return this.prisma.incident.update({ where: { id }, data: { status } });
  }

  async updateVisitOutcome(incidentId: string, outcome: VisitOutcome): Promise<void> {
    // E1-02: visita e incidencia cambian juntas o no cambia ninguna.
    await this.prisma.$transaction([
      this.prisma.visit.update({
        where: { incidentId },
        data: { status: outcome.visitStatus, completedAt: outcome.completedAt },
      }),
      this.prisma.incident.update({
        where: { id: incidentId },
        data: { status: outcome.incidentStatus },
      }),
    ]);
  }
}

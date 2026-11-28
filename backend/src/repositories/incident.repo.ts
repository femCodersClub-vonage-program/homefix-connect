import type { Incident, IncidentStatus, Prisma, VisitStatus } from '@prisma/client';

export type IncidentWithRelations = Prisma.IncidentGetPayload<{
  include: {
    technician: true;
    // B2: destinatarias del SMS post-visita (inquilina y gestora).
    tenant: true;
    manager: true;
    visit: { include: { videoSession: true } };
  };
}>;

/** E1-02: resultado de la visita que marca la técnica (visita + incidencia a la vez). */
export type VisitOutcome = {
  visitStatus: Extract<VisitStatus, 'COMPLETED' | 'CANCELLED'>;
  completedAt: Date | null;
  incidentStatus: IncidentStatus;
};

export interface IncidentRepo {
  findById(id: string): Promise<IncidentWithRelations | null>;
  updateStatus(id: string, status: IncidentStatus): Promise<Incident>;
  /** E1-02: cambia `Visit.status`/`completedAt` e `Incident.status` en una sola transacción. */
  updateVisitOutcome(incidentId: string, outcome: VisitOutcome): Promise<void>;
  /**
   * E3-02: pasa la incidencia a CLOSED solo si sigue VIDEO_COMPLETED con la visita
   * COMPLETED, en una sola operación (por si la técnica la corrige a la vez).
   * Devuelve `false` si no se cumplía.
   */
  closeIfReportReady(incidentId: string): Promise<boolean>;
}

/**
 * Stub en memoria: no toca Postgres. La implementación con Prisma llegará
 * cuando una tarea la necesite y debe cumplir esta misma interface.
 */
export class InMemoryIncidentRepo implements IncidentRepo {
  private readonly incidents = new Map<string, IncidentWithRelations>();

  constructor(seed: IncidentWithRelations[] = []) {
    for (const incident of seed) {
      this.incidents.set(incident.id, incident);
    }
  }

  async findById(id: string): Promise<IncidentWithRelations | null> {
    return this.incidents.get(id) ?? null;
  }

  async updateStatus(id: string, status: IncidentStatus): Promise<Incident> {
    const incident = this.incidents.get(id);

    if (!incident) {
      throw new Error(`Incident ${id} not found`);
    }

    const updated: IncidentWithRelations = { ...incident, status };
    this.incidents.set(id, updated);
    return updated;
  }

  async updateVisitOutcome(incidentId: string, outcome: VisitOutcome): Promise<void> {
    const incident = this.incidents.get(incidentId);

    if (!incident?.visit) {
      throw new Error(`Visit for incident ${incidentId} not found`);
    }

    this.incidents.set(incidentId, {
      ...incident,
      status: outcome.incidentStatus,
      visit: {
        ...incident.visit,
        status: outcome.visitStatus,
        completedAt: outcome.completedAt,
      },
    });
  }

  async closeIfReportReady(incidentId: string): Promise<boolean> {
    const incident = this.incidents.get(incidentId);

    if (incident?.status !== 'VIDEO_COMPLETED' || incident.visit?.status !== 'COMPLETED') {
      return false;
    }

    this.incidents.set(incidentId, { ...incident, status: 'CLOSED' });
    return true;
  }
}

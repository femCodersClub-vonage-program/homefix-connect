import type { Incident, IncidentStatus, Prisma } from '@prisma/client';

export type IncidentWithRelations = Prisma.IncidentGetPayload<{
  include: { technician: true; visit: { include: { videoSession: true } } };
}>;

export interface IncidentRepo {
  findById(id: string): Promise<IncidentWithRelations | null>;
  updateStatus(id: string, status: IncidentStatus): Promise<Incident>;
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
}

import { logger } from '../lib/logger.js';
import type { IncidentRepo } from '../repositories/incident.repo.js';

// E3-02 · La gestora asignada cierra la incidencia cuando el «informe» está listo
// (Visit COMPLETED + Incident VIDEO_COMPLETED; no hay modelo de informe).
// Spec: specs/features/E3-02-close-incident/02-specification.md

export type CloseIncidentInput = {
  incidentId: string;
  userId: string;
  role: 'TENANT' | 'TECHNICIAN' | 'MANAGER';
};

export type CloseIncidentResult =
  | { kind: 'not_found' }
  | { kind: 'forbidden' }
  | { kind: 'report_not_ready' }
  | { kind: 'already_closed' }
  | { kind: 'closed' };

export class CloseIncidentService {
  constructor(private readonly incidentRepo: IncidentRepo) {}

  async close({ incidentId, userId, role }: CloseIncidentInput): Promise<CloseIncidentResult> {
    // 404
    const incident = await this.incidentRepo.findById(incidentId);
    if (!incident) return { kind: 'not_found' };

    // 403 · solo la gestora asignada a ESTA incidencia
    if (role !== 'MANAGER' || incident.managerId !== userId) {
      return { kind: 'forbidden' };
    }

    // 200 · idempotente
    if (incident.status === 'CLOSED') return { kind: 'already_closed' };

    // 409 · informe no listo
    if (incident.status !== 'VIDEO_COMPLETED' || incident.visit?.status !== 'COMPLETED') {
      return { kind: 'report_not_ready' };
    }

    if (await this.incidentRepo.closeIfReportReady(incidentId)) {
      logger.info({ incidentId }, 'incident closed by manager');
      return { kind: 'closed' };
    }

    // Algo cambió entre la lectura y el UPDATE (otra petición la cerró o la técnica
    // la corrigió a No completada): se vuelve a mirar para responder lo correcto.
    const now = await this.incidentRepo.findById(incidentId);
    return now?.status === 'CLOSED' ? { kind: 'already_closed' } : { kind: 'report_not_ready' };
  }
}

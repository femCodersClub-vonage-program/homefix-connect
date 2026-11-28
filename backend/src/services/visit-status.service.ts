import { logger } from '../lib/logger.js';
import type { IncidentRepo } from '../repositories/incident.repo.js';
import type { PostVisitNotifier } from './messaging.service.js';

// E1-02 · La técnica marca la visita como Completada o No completada.
// Spec: specs/features/E1-02-visit-status/02-specification.md

/** COMPLETED = «Completada» · CANCELLED = «No completada» (D4, D5). */
export type VisitStatusChange = 'COMPLETED' | 'CANCELLED';

export type NotificationSummary = { sent: number; failed: number; skipped: number };

export type VisitStatusInput = {
  incidentId: string;
  userId: string;
  role: 'TENANT' | 'TECHNICIAN' | 'MANAGER';
  status: VisitStatusChange;
};

export type VisitStatusResult =
  | { kind: 'not_found' }
  | { kind: 'forbidden' }
  | { kind: 'closed' }
  | { kind: 'visit_not_confirmed' }
  | { kind: 'no_video_session' }
  | { kind: 'unchanged' }
  | { kind: 'not_completed' }
  /** `notifications` falta si `sendPostVisit` lanzó (Q4): la visita ya está completada. */
  | { kind: 'completed'; notifications?: NotificationSummary };

export type VisitStatusServiceOptions = {
  incidentRepo: IncidentRepo;
  postVisitNotifier: PostVisitNotifier;
  now?: () => Date;
};

export class VisitStatusService {
  private readonly incidentRepo: IncidentRepo;
  private readonly postVisitNotifier: PostVisitNotifier;
  private readonly now: () => Date;

  constructor(options: VisitStatusServiceOptions) {
    this.incidentRepo = options.incidentRepo;
    this.postVisitNotifier = options.postVisitNotifier;
    this.now = options.now ?? (() => new Date());
  }

  async change(input: VisitStatusInput): Promise<VisitStatusResult> {
    const { incidentId, userId, role, status } = input;

    // 404
    const incident = await this.incidentRepo.findById(incidentId);
    if (!incident) return { kind: 'not_found' };

    // 403 · solo la técnica asignada a ESTA incidencia
    if (role !== 'TECHNICIAN' || incident.technicianId !== userId) {
      return { kind: 'forbidden' };
    }

    // 409 · incidencia cerrada: ya no se admite ninguna transición (§3.5)
    if (incident.status === 'CLOSED') return { kind: 'closed' };

    // 409 · tiene que haber habido videollamada (Q2: sesión ACTIVE o ENDED)
    const visit = incident.visit;
    const session = visit?.videoSession;
    if (!visit || !session || session.status === 'PENDING') {
      return { kind: 'no_video_session' };
    }
    if (visit.status === 'PENDING') return { kind: 'visit_not_confirmed' };

    // 200 · mismo estado: no se toca nada ni se envían SMS
    if (visit.status === status) {
      logger.info({ incidentId, status }, 'visit status unchanged');
      return { kind: 'unchanged' };
    }

    if (status === 'CANCELLED') {
      await this.incidentRepo.updateVisitOutcome(incidentId, {
        visitStatus: 'CANCELLED',
        completedAt: null,
        incidentStatus: 'VISIT_ASSIGNED',
      });
      logger.info({ incidentId, from: visit.status }, 'visit marked as not completed');
      return { kind: 'not_completed' };
    }

    // COMPLETED: primero se guarda el estado, después los SMS (como A4 · Q4).
    await this.incidentRepo.updateVisitOutcome(incidentId, {
      visitStatus: 'COMPLETED',
      completedAt: this.now(),
      incidentStatus: 'VIDEO_COMPLETED',
    });
    logger.info({ incidentId, from: visit.status }, 'visit marked as completed');

    try {
      // '' → sendPostVisit usa el nombre de la técnica de la incidencia.
      // E4-02: a quien ya tenga registro no se le reenvía (ALREADY_SENT).
      const result = await this.postVisitNotifier.sendPostVisit(incidentId, '');
      const notifications = {
        sent: result.sent.length,
        failed: result.failed.length,
        skipped: result.skipped.length,
      };
      logger.info({ incidentId, ...notifications }, 'post-visit notification done');
      return { kind: 'completed', notifications };
    } catch (error) {
      logger.error(
        { incidentId, error: error instanceof Error ? error.name : 'UnknownError' },
        'post-visit notification failed',
      );
      return { kind: 'completed' };
    }
  }
}

import { logger } from '../lib/logger.js';
import type { IncidentRepo } from '../repositories/incident.repo.js';

export interface MessagingService {
  sendSms(to: string, body: string): Promise<{ providerMessageId: string }>;
}

/**
 * Stub en memoria: no envía SMS reales. La implementación con Vonage llega
 * en B1/B2 y debe cumplir esta misma interface.
 */
export class InMemoryMessagingService implements MessagingService {
  private counter = 0;

  async sendSms(
    _to: string,
    _body: string,
  ): Promise<{ providerMessageId: string }> {
    this.counter += 1;
    return { providerMessageId: `stub-msg-${this.counter}` };
  }
}

// B2 · Aviso post-visita por SMS (gestora + inquilina).
// Spec: specs/features/B2-send-sms/02-specification.md

const POST_VISIT_TEMPLATE =
  'Visita realizada para la incidencia «{titulo}» por {tecnica}. Cuando el informe esté listo te notificaremos.';

export function buildPostVisitBody(title: string, technicianName: string): string {
  return POST_VISIT_TEMPLATE.replace('{titulo}', title).replace(
    '{tecnica}',
    technicianName,
  );
}

export type PostVisitRole = 'MANAGER' | 'TENANT';

export type PostVisitResult = {
  sent: { recipientId: string; role: PostVisitRole; providerMessageId: string }[];
  failed: { recipientId: string; role: PostVisitRole; error: string }[];
  skipped: { role: 'MANAGER'; reason: 'NO_MANAGER' }[];
};

/** Lo que llama la A4 al terminar la videollamada (Q1: interface aparte de MessagingService). */
export interface PostVisitNotifier {
  sendPostVisit(incidentId: string, technicianName: string): Promise<PostVisitResult>;
}

export type MessagingPostVisitNotifierOptions = {
  messaging: MessagingService;
  incidentRepo: IncidentRepo;
};

export class MessagingPostVisitNotifier implements PostVisitNotifier {
  private readonly messaging: MessagingService;
  private readonly incidentRepo: IncidentRepo;

  constructor(options: MessagingPostVisitNotifierOptions) {
    this.messaging = options.messaging;
    this.incidentRepo = options.incidentRepo;
  }

  async sendPostVisit(
    incidentId: string,
    technicianName: string,
  ): Promise<PostVisitResult> {
    const incident = await this.incidentRepo.findById(incidentId);
    if (!incident) {
      throw new Error(`Incident ${incidentId} not found`);
    }

    // Q2: el parámetro manda; si llega vacío, el nombre de la técnica de la incidencia.
    const tecnica = technicianName.trim() || incident.technician?.name.trim();
    if (!tecnica) {
      throw new Error('Falta el nombre de la técnica');
    }

    const body = buildPostVisitBody(incident.title, tecnica);
    const result: PostVisitResult = { sent: [], failed: [], skipped: [] };

    // Q5: gestora → inquilina. La gestora es opcional en el modelo.
    const recipients: { role: PostVisitRole; user: { id: string; phone: string } }[] = [];
    if (incident.manager) {
      recipients.push({ role: 'MANAGER', user: incident.manager });
    } else {
      result.skipped.push({ role: 'MANAGER', reason: 'NO_MANAGER' });
      logger.warn({ incidentId }, 'post-visit sms skipped: incident has no manager');
    }
    recipients.push({ role: 'TENANT', user: incident.tenant });

    // Q4: si falla una, se sigue con la otra; los reintentos son de la B3.
    for (const { role, user } of recipients) {
      try {
        const { providerMessageId } = await this.messaging.sendSms(user.phone, body);
        result.sent.push({ recipientId: user.id, role, providerMessageId });
        logger.info(
          { incidentId, recipientId: user.id, role, providerMessageId },
          'post-visit sms sent',
        );
      } catch (error) {
        const errorName = error instanceof Error ? error.name : 'UnknownError';
        result.failed.push({ recipientId: user.id, role, error: errorName });
        logger.error(
          { incidentId, recipientId: user.id, role, error: errorName },
          'post-visit sms failed',
        );
      }
    }

    return result;
  }
}

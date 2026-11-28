import type { NotificationStatus } from '@prisma/client';

import { logger } from '../lib/logger.js';
import type { NotificationRepo } from '../repositories/notification.repo.js';

// E2-02 · Aplica a una Notification el estado de entrega que manda Vonage (B4).
// Lo usa el webhook POST /api/webhooks/message-status (E2-01).
// Spec: specs/features/E2-02-notification-status/02-specification.md

/** Lo que el webhook necesita del evento de Vonage Messages. */
export type MessageStatusEvent = {
  messageUuid: string;
  /** Estado de Vonage: submitted, delivered, read, rejected, undeliverable… */
  status: string;
  /** ISO 8601. Si no se puede leer, se usa la hora actual. */
  timestamp?: string;
  error?: { title?: string; detail?: string };
};

export type ApplyStatusResult = 'processed' | 'already_processed' | 'ignored';

// MVP_EXTENDED.md §4.4 · D9: estados reales de Vonage para SMS.
const STATUS_MAP: Record<string, NotificationStatus> = {
  submitted: 'SUBMITTED',
  delivered: 'DELIVERED',
  read: 'DELIVERED',
  rejected: 'FAILED',
  undeliverable: 'FAILED',
};

/**
 * ¿Se puede pasar de `current` a `next`? Nunca se retrocede:
 * QUEUED → SUBMITTED → DELIVERED; FAILED desde QUEUED/SUBMITTED.
 * FAILED es terminal salvo un `delivered` posterior. DELIVERED es terminal.
 */
export function canTransition(current: NotificationStatus, next: NotificationStatus): boolean {
  switch (next) {
    case 'SUBMITTED':
      return current === 'QUEUED';
    case 'DELIVERED':
      return current === 'QUEUED' || current === 'SUBMITTED' || current === 'FAILED';
    case 'FAILED':
      return current === 'QUEUED' || current === 'SUBMITTED';
    case 'QUEUED':
      return false;
  }
}

function parseTimestamp(timestamp: string | undefined): Date {
  const date = timestamp ? new Date(timestamp) : new Date(Number.NaN);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function errorText(error: MessageStatusEvent['error'], vonageStatus: string): string {
  const parts = [error?.title, error?.detail].filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(': ') : vonageStatus;
}

export class NotificationStatusService {
  private readonly notificationRepo: NotificationRepo;

  constructor(notificationRepo: NotificationRepo) {
    this.notificationRepo = notificationRepo;
  }

  async applyStatus(event: MessageStatusEvent): Promise<ApplyStatusResult> {
    const { messageUuid } = event;
    const vonageStatus = event.status.toLowerCase();
    const next = STATUS_MAP[vonageStatus];

    if (!next) {
      logger.info({ messageUuid, vonageStatus }, 'message status ignored: unknown status');
      return 'ignored';
    }

    const notification = await this.notificationRepo.findByProviderMessageId(messageUuid);
    if (!notification) {
      logger.warn({ messageUuid, vonageStatus }, 'message status ignored: unknown message');
      return 'ignored';
    }

    const current = notification.status;
    if (current === next || !canTransition(current, next)) {
      logger.info(
        { notificationId: notification.id, messageUuid, current, next },
        'message status already processed',
      );
      return 'already_processed';
    }

    await this.notificationRepo.updateStatus(notification.id, {
      status: next,
      ...(next === 'DELIVERED'
        ? { deliveredAt: parseTimestamp(event.timestamp), error: null }
        : {}),
      ...(next === 'FAILED' ? { error: errorText(event.error, vonageStatus) } : {}),
    });

    logger.info(
      { notificationId: notification.id, messageUuid, from: current, to: next },
      'message status updated',
    );
    return 'processed';
  }
}

import { randomUUID } from 'node:crypto';

import type { Notification, NotificationStatus } from '@prisma/client';

// B3 · Registros Notification del aviso post-visita.
// Spec: specs/features/B3-notifications/02-specification.md

export type NotificationCreate = {
  incidentId: string;
  recipientId: string;
  template: string;
  /** En la B3 solo QUEUED o FAILED (SUBMITTED/DELIVERED llegan con la B4). */
  status: NotificationStatus;
  providerMessageId?: string | null;
  error?: string | null;
  sentAt?: Date | null;
};

export interface NotificationRepo {
  existsForIncident(incidentId: string, template: string): Promise<boolean>;
  create(data: NotificationCreate): Promise<Notification>;
}

/** Stub en memoria: no toca Postgres. */
export class InMemoryNotificationRepo implements NotificationRepo {
  private readonly notifications: Notification[] = [];

  constructor(seed: Notification[] = []) {
    this.notifications.push(...seed);
  }

  /** Solo para tests: lo guardado hasta ahora. No forma parte de la interface. */
  get items(): readonly Notification[] {
    return this.notifications;
  }

  async existsForIncident(incidentId: string, template: string): Promise<boolean> {
    return this.notifications.some(
      (n) => n.incidentId === incidentId && n.template === template,
    );
  }

  async create(data: NotificationCreate): Promise<Notification> {
    const now = new Date();
    const notification: Notification = {
      id: randomUUID(),
      incidentId: data.incidentId,
      recipientId: data.recipientId,
      channel: 'SMS',
      status: data.status,
      template: data.template,
      providerMessageId: data.providerMessageId ?? null,
      error: data.error ?? null,
      sentAt: data.sentAt ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.notifications.push(notification);
    return notification;
  }
}

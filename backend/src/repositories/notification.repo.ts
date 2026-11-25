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

/** E2-02 · Cambio de estado que llega de la B4 (webhook message-status). */
export type NotificationStatusUpdate = {
  status: NotificationStatus;
  deliveredAt?: Date | null;
  error?: string | null;
};

export interface NotificationRepo {
  existsForIncident(incidentId: string, template: string): Promise<boolean>;
  create(data: NotificationCreate): Promise<Notification>;
  /** E2-02: `providerMessageId` es único (E1-01). */
  findByProviderMessageId(providerMessageId: string): Promise<Notification | null>;
  /** E2-02: solo cambia los campos que se pasan. */
  updateStatus(id: string, data: NotificationStatusUpdate): Promise<Notification>;
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
      deliveredAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.notifications.push(notification);
    return notification;
  }

  async findByProviderMessageId(providerMessageId: string): Promise<Notification | null> {
    return this.notifications.find((n) => n.providerMessageId === providerMessageId) ?? null;
  }

  async updateStatus(id: string, data: NotificationStatusUpdate): Promise<Notification> {
    const notification = this.notifications.find((n) => n.id === id);
    if (!notification) {
      throw new Error(`Notification ${id} not found`);
    }
    notification.status = data.status;
    if (data.deliveredAt !== undefined) notification.deliveredAt = data.deliveredAt;
    if (data.error !== undefined) notification.error = data.error;
    notification.updatedAt = new Date();
    return notification;
  }
}

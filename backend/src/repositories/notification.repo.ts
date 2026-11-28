import { randomUUID } from 'node:crypto';

import type { Notification, NotificationStatus, Prisma } from '@prisma/client';

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

/** E3-01 · Notificación con lo mínimo de la destinataria (sin teléfono ni email). */
export type NotificationWithRecipient = Prisma.NotificationGetPayload<{
  include: { recipient: { select: { id: true; name: true; role: true } } };
}>;

export type NotificationRecipient = NotificationWithRecipient['recipient'];

/**
 * E4-02 · Ya existe una Notification con la misma incidencia + plantilla +
 * destinataria (`@@unique([incidentId, template, recipientId])`, P2002 en Prisma).
 * `sendPostVisit` lo trata como `ALREADY_SENT`.
 */
export class NotificationAlreadyExistsError extends Error {
  constructor(incidentId: string, template: string, recipientId: string) {
    super(
      `Notification already exists for incident ${incidentId}, template ${template}, recipient ${recipientId}`,
    );
    this.name = 'NotificationAlreadyExistsError';
  }
}

export interface NotificationRepo {
  /** E4-02: ids de las destinatarias que ya tienen registro (cualquier estado) para esa incidencia y plantilla. */
  findRecipientIds(incidentId: string, template: string): Promise<string[]>;
  /** Lanza `NotificationAlreadyExistsError` si choca con la unique por destinataria. */
  create(data: NotificationCreate): Promise<Notification>;
  /** E2-02: `providerMessageId` es único (E1-01). */
  findByProviderMessageId(providerMessageId: string): Promise<Notification | null>;
  /** E2-02: solo cambia los campos que se pasan. */
  updateStatus(id: string, data: NotificationStatusUpdate): Promise<Notification>;
  /** E3-01: las de la incidencia, de la más antigua a la más nueva. */
  findByIncidentId(incidentId: string): Promise<NotificationWithRecipient[]>;
}

/** Stub en memoria: no toca Postgres. */
export class InMemoryNotificationRepo implements NotificationRepo {
  private readonly notifications: Notification[] = [];

  private readonly recipients = new Map<string, NotificationRecipient>();

  /** `recipients`: id, nombre y rol de las destinatarias (para `findByIncidentId`). */
  constructor(seed: Notification[] = [], recipients: NotificationRecipient[] = []) {
    this.notifications.push(...seed);
    for (const recipient of recipients) this.recipients.set(recipient.id, recipient);
  }

  /** Solo para tests: lo guardado hasta ahora. No forma parte de la interface. */
  get items(): readonly Notification[] {
    return this.notifications;
  }

  async findRecipientIds(incidentId: string, template: string): Promise<string[]> {
    const ids = this.notifications
      .filter((n) => n.incidentId === incidentId && n.template === template)
      .map((n) => n.recipientId);
    return [...new Set(ids)];
  }

  async create(data: NotificationCreate): Promise<Notification> {
    // E4-02: la misma unique que en Postgres.
    const duplicate = this.notifications.some(
      (n) =>
        n.incidentId === data.incidentId &&
        n.template === data.template &&
        n.recipientId === data.recipientId,
    );
    if (duplicate) {
      throw new NotificationAlreadyExistsError(data.incidentId, data.template, data.recipientId);
    }
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

  async findByIncidentId(incidentId: string): Promise<NotificationWithRecipient[]> {
    return this.notifications
      .filter((n) => n.incidentId === incidentId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((n) => {
        const recipient = this.recipients.get(n.recipientId);
        if (!recipient) {
          throw new Error(`Recipient ${n.recipientId} not seeded in InMemoryNotificationRepo`);
        }
        return { ...n, recipient };
      });
  }
}

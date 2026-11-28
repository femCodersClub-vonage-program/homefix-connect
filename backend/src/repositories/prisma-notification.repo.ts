import { Prisma, type Notification, type PrismaClient } from '@prisma/client';

import {
  type NotificationCreate,
  NotificationAlreadyExistsError,
  type NotificationRepo,
  type NotificationStatusUpdate,
} from './notification.repo.js';

/** E4-02: P2002 sobre la unique `[incidentId, template, recipientId]` (no sobre `providerMessageId`). */
function isRecipientUniqueViolation(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
    return false;
  }
  const target = error.meta?.target;
  const fields = Array.isArray(target) ? target.map(String) : [String(target ?? '')];
  return fields.some((field) => field.includes('recipientId'));
}

export class PrismaNotificationRepo implements NotificationRepo {
  private readonly prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findRecipientIds(incidentId: string, template: string): Promise<string[]> {
    const rows = await this.prisma.notification.findMany({
      where: { incidentId, template },
      select: { recipientId: true },
      distinct: ['recipientId'],
    });
    return rows.map((row) => row.recipientId);
  }

  async create(data: NotificationCreate): Promise<Notification> {
    try {
      return await this.prisma.notification.create({ data });
    } catch (error) {
      if (isRecipientUniqueViolation(error)) {
        throw new NotificationAlreadyExistsError(data.incidentId, data.template, data.recipientId);
      }
      throw error;
    }
  }

  async findByProviderMessageId(providerMessageId: string): Promise<Notification | null> {
    return this.prisma.notification.findUnique({ where: { providerMessageId } });
  }

  async updateStatus(id: string, data: NotificationStatusUpdate): Promise<Notification> {
    return this.prisma.notification.update({ where: { id }, data });
  }
}

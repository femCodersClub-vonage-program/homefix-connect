import type { Notification, PrismaClient } from '@prisma/client';

import type {
  NotificationCreate,
  NotificationRepo,
  NotificationStatusUpdate,
  NotificationWithRecipient,
} from './notification.repo.js';

export class PrismaNotificationRepo implements NotificationRepo {
  private readonly prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async existsForIncident(incidentId: string, template: string): Promise<boolean> {
    const count = await this.prisma.notification.count({
      where: { incidentId, template },
    });
    return count > 0;
  }

  create(data: NotificationCreate): Promise<Notification> {
    return this.prisma.notification.create({ data });
  }

  findByProviderMessageId(providerMessageId: string): Promise<Notification | null> {
    return this.prisma.notification.findUnique({ where: { providerMessageId } });
  }

  updateStatus(id: string, data: NotificationStatusUpdate): Promise<Notification> {
    return this.prisma.notification.update({ where: { id }, data });
  }

  findByIncidentId(incidentId: string): Promise<NotificationWithRecipient[]> {
    return this.prisma.notification.findMany({
      where: { incidentId },
      include: { recipient: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }
}

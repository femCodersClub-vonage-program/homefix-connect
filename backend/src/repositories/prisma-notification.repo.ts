import type { Notification, PrismaClient } from '@prisma/client';

import type { NotificationCreate, NotificationRepo } from './notification.repo.js';

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
}

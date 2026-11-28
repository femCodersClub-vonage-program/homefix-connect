import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../src/app.js';
import { prisma } from '../../src/db/client.js';
import { IDS, resetDatabase, seedPostVisitData } from './helpers/db.js';

// E3-01 · GET /api/incidents/{id}/notifications con Postgres real (INT-N1 a INT-N3).
// Spec: specs/features/E3-01-notifications-endpoint/02-specification.md

const app = createApp();

function list(userId: string, role: string) {
  return request(app)
    .get(`/api/incidents/${IDS.incident}/notifications`)
    .set('X-User-Id', userId)
    .set('X-User-Role', role);
}

beforeEach(async () => {
  await resetDatabase(prisma);
  await seedPostVisitData(prisma);
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('GET /api/incidents/{id}/notifications con Postgres (integración)', () => {
  it('INT-N1 · devuelve las filas con la destinataria (id, nombre, rol), en orden y sin teléfonos', async () => {
    await prisma.notification.create({
      data: {
        incidentId: IDS.incident, recipientId: IDS.manager, template: 'post_visit',
        status: 'DELIVERED', providerMessageId: 'msg-1', sentAt: new Date(), deliveredAt: new Date(),
      },
    });
    await prisma.notification.create({
      data: {
        incidentId: IDS.incident, recipientId: IDS.tenant, template: 'post_visit',
        status: 'FAILED', error: 'VonageNetworkError',
      },
    });

    const res = await list(IDS.manager, 'MANAGER');

    expect(res.status).toBe(200);
    expect(res.body.notifications).toEqual([
      expect.objectContaining({
        recipient: { id: IDS.manager, name: 'Gestora Demo', role: 'MANAGER' },
        status: 'DELIVERED',
        deliveredAt: expect.any(String),
      }),
      expect.objectContaining({
        recipient: { id: IDS.tenant, name: 'Inquilina Demo', role: 'TENANT' },
        status: 'FAILED',
        error: 'VonageNetworkError',
        sentAt: null,
      }),
    ]);
    expect(JSON.stringify(res.body)).not.toMatch(/\+34|msg-1/);
  });

  it('INT-N2 · lista vacía si aún no hay SMS', async () => {
    const res = await list(IDS.tenant, 'TENANT');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ notifications: [] });
  });

  it('INT-N3 · 403 para quien no participa', async () => {
    const res = await list('usr_otra', 'TECHNICIAN');

    expect(res.status).toBe(403);
  });
});

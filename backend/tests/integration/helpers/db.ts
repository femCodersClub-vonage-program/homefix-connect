import type { PrismaClient } from '@prisma/client';

import { assertTestDatabaseUrl } from './test-db-url.js';

// B5 · Limpieza y seed mínimo para los tests de integración.

export const IDS = {
  tenant: 'usr_tenant_demo',
  technician: 'usr_technician_demo',
  manager: 'usr_manager_demo',
  incident: 'inc_demo',
} as const;

/** Vacía las tablas en orden de dependencias. Solo en una BD *_test. */
export async function resetDatabase(prisma: PrismaClient): Promise<void> {
  assertTestDatabaseUrl(process.env.DATABASE_URL);
  await prisma.notification.deleteMany();
  await prisma.videoSession.deleteMany();
  await prisma.visit.deleteMany();
  await prisma.incident.deleteMany();
  await prisma.user.deleteMany();
}

/** Inquilina, técnica, gestora (opcional) e incidencia en VIDEO_COMPLETED. Teléfonos falsos. */
export async function seedPostVisitData(
  prisma: PrismaClient,
  { withManager = true }: { withManager?: boolean } = {},
): Promise<void> {
  await prisma.user.createMany({
    data: [
      { id: IDS.tenant, name: 'Inquilina Demo', phone: '+34600000001', role: 'TENANT' },
      { id: IDS.technician, name: 'Técnica Demo', phone: '+34600000002', role: 'TECHNICIAN' },
      ...(withManager
        ? [{ id: IDS.manager, name: 'Gestora Demo', phone: '+34600000003', role: 'MANAGER' as const }]
        : []),
    ],
  });
  await prisma.incident.create({
    data: {
      id: IDS.incident,
      title: 'Fuga de agua en el baño',
      status: 'VIDEO_COMPLETED',
      tenantId: IDS.tenant,
      technicianId: IDS.technician,
      managerId: withManager ? IDS.manager : null,
    },
  });
}

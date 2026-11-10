import { prisma } from './client.js';

/**
 * Seed determinista del estado inicial del MVP (precondiciones de
 * docs/MVP_DEFINITION.md):
 *   - incidencia en VISIT_ASSIGNED
 *   - visita en CONFIRMED
 *   - sesión de video en PENDING
 *
 * IDs fijos para que el frontend y los tests puedan referenciarlos.
 */
const IDS = {
  tenant: 'usr_tenant_demo',
  technician: 'usr_technician_demo',
  manager: 'usr_manager_demo',
  incident: 'inc_demo',
  visit: 'visit_demo',
  videoSession: 'vs_demo',
} as const;

async function main() {
  const tenant = await prisma.user.upsert({
    where: { id: IDS.tenant },
    update: {},
    create: {
      id: IDS.tenant,
      name: 'Inquilina Demo',
      phone: '+34600000001',
      email: 'inquilina@example.com',
      role: 'TENANT',
    },
  });

  const technician = await prisma.user.upsert({
    where: { id: IDS.technician },
    update: {},
    create: {
      id: IDS.technician,
      name: 'Técnica Demo',
      phone: '+34600000002',
      email: 'tecnica@example.com',
      role: 'TECHNICIAN',
    },
  });

  const manager = await prisma.user.upsert({
    where: { id: IDS.manager },
    update: {},
    create: {
      id: IDS.manager,
      name: 'Gestora Demo',
      phone: '+34600000003',
      email: 'gestora@example.com',
      role: 'MANAGER',
    },
  });

  await prisma.incident.upsert({
    where: { id: IDS.incident },
    update: {},
    create: {
      id: IDS.incident,
      title: 'Fuga de agua en el baño',
      description: 'El grifo del lavabo pierde agua desde ayer.',
      status: 'VISIT_ASSIGNED',
      tenantId: tenant.id,
      technicianId: technician.id,
      managerId: manager.id,
    },
  });

  const scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.visit.upsert({
    where: { id: IDS.visit },
    update: {},
    create: {
      id: IDS.visit,
      incidentId: IDS.incident,
      scheduledAt,
      status: 'CONFIRMED',
    },
  });

  await prisma.videoSession.upsert({
    where: { id: IDS.videoSession },
    update: {},
    create: {
      id: IDS.videoSession,
      visitId: IDS.visit,
      status: 'PENDING',
    },
  });

  console.log('Seed OK');
  console.log(`  incidencia : ${IDS.incident} (VISIT_ASSIGNED)`);
  console.log(`  visita     : ${IDS.visit} (CONFIRMED, ${scheduledAt.toISOString()})`);
  console.log(`  video      : ${IDS.videoSession} (PENDING)`);
  console.log(`  usuarios   : ${IDS.tenant}, ${IDS.technician}, ${IDS.manager}`);
}

main()
  .catch((error) => {
    console.error('Seed falló:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

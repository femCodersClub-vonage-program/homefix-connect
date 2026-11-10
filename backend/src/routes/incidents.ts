import { Router } from 'express';

import { prisma } from '../db/client.js';

export const incidentsRouter = Router();

/**
 * Endpoint de humo (provisional) para comprobar la cadena completa
 * docker → Prisma → API. El contrato definitivo lo fija `T1` en
 * `backend/openapi.yaml`; quien lo tome debe reconciliar esta forma.
 */
incidentsRouter.get('/incidents/:id', async (req, res) => {
  const { id } = req.params;

  const incident = await prisma.incident.findUnique({
    where: { id },
    include: {
      tenant: true,
      technician: true,
      manager: true,
      visit: { include: { videoSession: true } },
    },
  });

  if (!incident) {
    res.status(404).json({ error: 'Incident not found', id });
    return;
  }

  res.json(incident);
});

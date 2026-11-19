import { Router } from 'express';

import { prisma } from '../db/client.js';

export const incidentsRouter = Router();

/**
 * GET /api/incidents/:id — devuelve la incidencia con la forma del schema
 * `Incident` de `backend/openapi.yaml` (issue #38).
 *
 * Se usa un `select` explícito para no exponer datos personales (`phone`,
 * `email`), relaciones que no son contrato (`tenant`, `manager`) ni campos
 * internos (`*Id`, fechas, `vonageSessionId`).
 */
incidentsRouter.get('/incidents/:id', async (req, res) => {
  const { id } = req.params;

  const incident = await prisma.incident.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      technician: { select: { id: true, name: true } },
      visit: {
        select: {
          id: true,
          status: true,
          scheduledAt: true,
          videoSession: { select: { id: true, status: true } },
        },
      },
    },
  });

  if (!incident) {
    res.status(404).json({ error: 'Incident not found', id });
    return;
  }

  res.json(incident);
});

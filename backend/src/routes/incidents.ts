import { Router } from 'express';
import { z } from 'zod';

import type {
  IncidentRepo,
  IncidentWithRelations,
} from '../repositories/incident.repo.js';

// GET /api/incidents/:id — contrato `Incident` de backend/openapi.yaml.
// #38: solo campos del contrato. E0-05: repo inyectado + cabeceras + pertenencia.
// Spec: specs/features/E0-05-incidents-contract/02-specification.md

export type IncidentsDeps = {
  incidentRepo: IncidentRepo;
};

// Express pasa los nombres de las cabeceras a minúsculas.
const headersSchema = z.object({
  'x-user-id': z.string().trim().min(1),
  'x-user-role': z.enum(['TENANT', 'TECHNICIAN', 'MANAGER']),
});

/**
 * Deja solo los campos del schema `Incident` del contrato: sin datos personales
 * (`phone`, `email`), sin `tenant`/`manager`, sin `*Id`, fechas internas ni
 * `vonageSessionId`.
 */
export function toIncidentContract(incident: IncidentWithRelations) {
  const { technician, visit } = incident;
  return {
    id: incident.id,
    title: incident.title,
    description: incident.description,
    status: incident.status,
    technician: technician ? { id: technician.id, name: technician.name } : null,
    visit: visit
      ? {
          id: visit.id,
          status: visit.status,
          scheduledAt: visit.scheduledAt,
          videoSession: visit.videoSession
            ? { id: visit.videoSession.id, status: visit.videoSession.status }
            : null,
        }
      : null,
  };
}

export function createIncidentsRouter({ incidentRepo }: IncidentsDeps) {
  const router = Router();

  router.get('/incidents/:id', async (req, res, next) => {
    try {
      // 401 · login simulado: faltan las cabeceras o el rol no existe
      const headers = headersSchema.safeParse(req.headers);
      if (!headers.success) {
        res.status(401).json({ error: 'Faltan las cabeceras X-User-Id / X-User-Role' });
        return;
      }
      const userId = headers.data['x-user-id'];
      const role = headers.data['x-user-role'];

      // 404 · la incidencia existe
      const incident = await incidentRepo.findById(req.params.id);
      if (!incident) {
        res.status(404).json({ error: 'Incident not found' });
        return;
      }

      // 403 · participa en ESTA incidencia con ese rol
      const participates =
        (role === 'TENANT' && incident.tenantId === userId) ||
        (role === 'TECHNICIAN' && incident.technicianId === userId) ||
        (role === 'MANAGER' && incident.managerId === userId);
      if (!participates) {
        res.status(403).json({ error: 'No tienes permiso para ver esta incidencia' });
        return;
      }

      res.json(toIncidentContract(incident));
    } catch (error) {
      next(error);
    }
  });

  return router;
}

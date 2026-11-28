import { Router } from "express";
import { z } from "zod";

import type { IncidentRepo, IncidentWithRelations } from "../repositories/incident.repo.js";
import type {
  NotificationRepo,
  NotificationWithRecipient,
} from "../repositories/notification.repo.js";

// E3-01 · GET /api/incidents/{id}/notifications (contrato de E1-01).
// Spec: specs/features/E3-01-notifications-endpoint/02-specification.md

export type NotificationsDeps = {
  incidentRepo: IncidentRepo;
  notificationRepo: NotificationRepo;
};

type Role = "TENANT" | "TECHNICIAN" | "MANAGER";

// Express pasa los nombres de las cabeceras a minúsculas.
const headersSchema = z.object({
  "x-user-id": z.string().trim().min(1),
  "x-user-role": z.enum(["TENANT", "TECHNICIAN", "MANAGER"]),
});

/** Participa = es la inquilina, la técnica o la gestora de ESTA incidencia, con su rol. */
export function isParticipant(
  incident: Pick<IncidentWithRelations, "tenantId" | "technicianId" | "managerId">,
  userId: string,
  role: Role,
): boolean {
  if (role === "TENANT") return incident.tenantId === userId;
  if (role === "TECHNICIAN") return incident.technicianId === userId;
  return incident.managerId === userId;
}

/** Schema `Notification` del contrato: sin teléfonos, emails ni providerMessageId. */
export function toNotificationContract(n: NotificationWithRecipient) {
  return {
    id: n.id,
    recipient: { id: n.recipient.id, name: n.recipient.name, role: n.recipient.role },
    channel: n.channel,
    status: n.status,
    template: n.template,
    sentAt: n.sentAt?.toISOString() ?? null,
    deliveredAt: n.deliveredAt?.toISOString() ?? null,
    error: n.error,
  };
}

export function createNotificationsRouter(deps: NotificationsDeps) {
  const { incidentRepo, notificationRepo } = deps;
  const router = Router();

  router.get("/incidents/:id/notifications", async (req, res, next) => {
    try {
      // 400 · cabeceras (Q1: como el contrato de E1-01)
      const headers = headersSchema.safeParse(req.headers);
      if (!headers.success) {
        res.status(400).json({ error: "Cabeceras X-User-Id / X-User-Role inválidas" });
        return;
      }

      // 404
      const incident = await incidentRepo.findById(req.params.id);
      if (!incident) {
        res.status(404).json({ error: "Incident not found" });
        return;
      }

      // 403 · solo participantes de la incidencia
      if (!isParticipant(incident, headers.data["x-user-id"], headers.data["x-user-role"])) {
        res.status(403).json({ error: "No participas en esta incidencia" });
        return;
      }

      const notifications = await notificationRepo.findByIncidentId(incident.id);
      res.json({ notifications: notifications.map(toNotificationContract) });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

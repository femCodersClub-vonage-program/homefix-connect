import { Router } from "express";
import { z } from "zod";

import type {
  CloseIncidentResult,
  CloseIncidentService,
} from "../services/close-incident.service.js";

// E3-02 · POST /api/incidents/{id}/close (contrato de E1-01). Body vacío.
// Spec: specs/features/E3-02-close-incident/02-specification.md

export type CloseIncidentDeps = {
  closeIncidentService: CloseIncidentService;
};

// Express pasa los nombres de las cabeceras a minúsculas.
const headersSchema = z.object({
  "x-user-id": z.string().trim().min(1),
  "x-user-role": z.enum(["TENANT", "TECHNICIAN", "MANAGER"]),
});

function toHttp(result: CloseIncidentResult): { code: number; body: Record<string, string> } {
  switch (result.kind) {
    case "not_found":
      return { code: 404, body: { error: "Incident not found" } };
    case "forbidden":
      return { code: 403, body: { error: "Solo la gestora asignada puede cerrar la incidencia" } };
    case "report_not_ready":
      return { code: 409, body: { error: "Report not ready" } };
    case "already_closed":
      return { code: 200, body: { status: "already_closed" } };
    case "closed":
      return { code: 200, body: { status: "closed" } };
  }
}

export function createCloseIncidentRouter(deps: CloseIncidentDeps) {
  const { closeIncidentService } = deps;
  const router = Router();

  router.post("/incidents/:id/close", async (req, res, next) => {
    try {
      // 400 · cabeceras (Q1: como el contrato de E1-01)
      const headers = headersSchema.safeParse(req.headers);
      if (!headers.success) {
        res.status(400).json({ error: "Cabeceras X-User-Id / X-User-Role inválidas" });
        return;
      }

      const result = await closeIncidentService.close({
        incidentId: req.params.id,
        userId: headers.data["x-user-id"],
        role: headers.data["x-user-role"],
      });

      const reply = toHttp(result);
      res.status(reply.code).json(reply.body);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

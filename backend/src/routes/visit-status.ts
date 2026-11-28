import { Router } from "express";
import { z } from "zod";

import type {
  VisitStatusResult,
  VisitStatusService,
} from "../services/visit-status.service.js";

// E1-02 · POST /api/incidents/{id}/visit-status (contrato de E1-01).
// Spec: specs/features/E1-02-visit-status/02-specification.md

export type VisitStatusDeps = {
  visitStatusService: VisitStatusService;
};

// Express pasa los nombres de las cabeceras a minúsculas.
const headersSchema = z.object({
  "x-user-id": z.string().trim().min(1),
  "x-user-role": z.enum(["TENANT", "TECHNICIAN", "MANAGER"]),
});

const bodySchema = z.object({
  status: z.enum(["COMPLETED", "CANCELLED"]),
});

type HttpReply = { code: number; body: Record<string, unknown> };

function toHttp(result: VisitStatusResult): HttpReply {
  switch (result.kind) {
    case "not_found":
      return { code: 404, body: { error: "Incident not found" } };
    case "forbidden":
      return {
        code: 403,
        body: { error: "Solo la técnica asignada puede cambiar el estado de la visita" },
      };
    case "closed":
      return { code: 409, body: { error: "Incident is closed" } };
    case "no_video_session":
      return { code: 409, body: { error: "No video session" } };
    case "visit_not_confirmed":
      return { code: 409, body: { error: "Visit is not confirmed" } };
    case "unchanged":
      return { code: 200, body: { status: "unchanged" } };
    case "not_completed":
      return { code: 200, body: { status: "not_completed" } };
    case "completed":
      return {
        code: 200,
        body: result.notifications
          ? { status: "completed", notifications: result.notifications }
          : { status: "completed" },
      };
  }
}

export function createVisitStatusRouter(deps: VisitStatusDeps) {
  const { visitStatusService } = deps;
  const router = Router();

  router.post("/incidents/:id/visit-status", async (req, res, next) => {
    try {
      // 400 · cabeceras y body (Q1: como el contrato de E1-01 y POST /video-tokens)
      const headers = headersSchema.safeParse(req.headers);
      const body = bodySchema.safeParse(req.body);
      if (!headers.success || !body.success) {
        res.status(400).json({
          error: "Cabeceras X-User-Id / X-User-Role o status inválidos",
        });
        return;
      }

      const result = await visitStatusService.change({
        incidentId: req.params.id,
        userId: headers.data["x-user-id"],
        role: headers.data["x-user-role"],
        status: body.data.status,
      });

      const reply = toHttp(result);
      res.status(reply.code).json(reply.body);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

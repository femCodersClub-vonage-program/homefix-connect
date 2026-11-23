import { Router } from "express";
import { z } from "zod";

import { logger } from "../lib/logger.js";
import { verifyVonageSignature } from "../middleware/verifyVonageSignature.js";
import type { IncidentRepo } from "../repositories/incident.repo.js";
import type { VideoSessionRepo } from "../repositories/video-session.repo.js";
import type { PostVisitNotifier } from "../services/messaging.service.js";

// A4 · Webhook de Session Monitoring de Vonage Video.
// Spec: specs/features/A4-video-webhook/02-specification.md

export type VideoEventsDeps = {
  incidentRepo: IncidentRepo;
  videoSessionRepo: VideoSessionRepo;
  postVisitNotifier: PostVisitNotifier;
  /** Por defecto, el secreto de `env` (X3). Los tests inyectan uno. */
  getSignatureSecret?: () => string | undefined;
};

// Vonage manda más campos (projectId, timestamp, connection, stream…); solo usamos estos.
const eventSchema = z.object({
  event: z.string().min(1),
  sessionId: z.string().trim().min(1).optional(),
  reason: z.string().optional(),
});

// Q1: solo este evento cierra la visita (~1 min después de que cuelgue la última persona).
const SESSION_DESTROYED = "sessionDestroyed";

export function createVideoEventsRouter(deps: VideoEventsDeps) {
  const { incidentRepo, videoSessionRepo, postVisitNotifier, getSignatureSecret } =
    deps;
  const router = Router();

  router.post(
    "/webhooks/video-events",
    verifyVonageSignature(getSignatureSecret),
    async (req, res, next) => {
      try {
        const parsed = eventSchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({ error: "Invalid payload" });
          return;
        }
        const { event, sessionId, reason } = parsed.data;

        if (event !== SESSION_DESTROYED) {
          res.status(200).json({ status: "ignored" });
          return;
        }
        if (!sessionId) {
          res.status(400).json({ error: "Invalid payload" });
          return;
        }

        const session = await videoSessionRepo.findByVonageSessionId(sessionId);
        if (!session?.visit) {
          logger.warn({ event, sessionId }, "video event for unknown session");
          res.status(400).json({ error: "Unknown session" });
          return;
        }

        const incidentId = session.visit.incidentId;
        const incident = await incidentRepo.findById(incidentId);

        // Idempotencia (E-05): un sessionDestroyed repetido no hace nada.
        if (session.status === "ENDED" || incident?.status === "VIDEO_COMPLETED") {
          logger.info(
            { event, sessionId, incidentId },
            "video event already processed",
          );
          res.status(200).json({ status: "already_processed" });
          return;
        }

        // Q4: primero se cierra la visita, después los SMS.
        await videoSessionRepo.update(session.id, {
          status: "ENDED",
          endedAt: new Date(),
        });
        await incidentRepo.updateStatus(incidentId, "VIDEO_COMPLETED");
        logger.info({ event, sessionId, incidentId, reason }, "video session ended");

        // Q3: si falla, la visita ya está cerrada; se registra y se responde 200.
        try {
          // Q5: '' → sendPostVisit usa el nombre de la técnica de la incidencia.
          const result = await postVisitNotifier.sendPostVisit(incidentId, "");
          logger.info(
            {
              incidentId,
              sent: result.sent.length,
              failed: result.failed.length,
              skipped: result.skipped.length,
            },
            "post-visit notification done",
          );
        } catch (error) {
          logger.error(
            {
              incidentId,
              error: error instanceof Error ? error.name : "UnknownError",
            },
            "post-visit notification failed",
          );
        }

        res.status(200).json({ status: "processed" });
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}

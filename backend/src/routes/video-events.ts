import { Router } from "express";
import { z } from "zod";

import { logger } from "../lib/logger.js";
import { verifyVonageSignature } from "../middleware/verifyVonageSignature.js";
import type { IncidentRepo } from "../repositories/incident.repo.js";
import type { VideoSessionRepo } from "../repositories/video-session.repo.js";
import type { PostVisitNotifier } from "../services/messaging.service.js";

// A4 · Webhook de Session Monitoring de Vonage Video.
// Spec: specs/features/A4-video-webhook/02-specification.md
// Endurecido en E0-02: specs/features/E0-02-session-destroyed/02-specification.md

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
// E0-02: reason de sessionDestroyed que no cierra nada.
const SERVER_ROTATION = "serverRotation";

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

        // E0-02 · Q1: una rotación de servidor no es el fin de la llamada (la gente
        // puede reconectar); no se toca nada.
        if (reason === SERVER_ROTATION) {
          logger.info({ event, sessionId, reason }, "video event ignored: server rotation");
          res.status(200).json({ status: "ignored" });
          return;
        }

        const session = await videoSessionRepo.findByVonageSessionId(sessionId);
        // E0-02: 200 y no 400, para que Vonage no reintente un evento que nunca
        // podremos procesar.
        if (!session?.visit) {
          logger.warn({ event, sessionId }, "video event ignored: unknown session");
          res.status(200).json({ status: "ignored" });
          return;
        }

        // Idempotencia (E-05): una sesión ya cerrada no hace nada.
        if (session.status === "ENDED") {
          logger.info({ event, sessionId }, "video event already processed");
          res.status(200).json({ status: "already_processed" });
          return;
        }

        const incidentId = session.visit.incidentId;
        const incident = await incidentRepo.findById(incidentId);

        // E0-02: la sesión se cierra SIEMPRE; separado de cerrar la visita.
        await videoSessionRepo.update(session.id, {
          status: "ENDED",
          endedAt: new Date(),
        });

        // El cierre de la visita + SMS solo procede si la visita seguía abierta:
        // incidencia VISIT_ASSIGNED, visita CONFIRMED y sesión que llegó a ACTIVE.
        const visitStillOpen =
          incident?.status === "VISIT_ASSIGNED" &&
          session.visit.status === "CONFIRMED" &&
          session.status === "ACTIVE";

        if (!visitStillOpen) {
          // Q2: la visita ya estaba cerrada (o nunca empezó): sin SMS.
          logger.info(
            {
              event,
              sessionId,
              incidentId,
              reason,
              incidentStatus: incident?.status,
              visitStatus: session.visit.status,
              sessionStatus: session.status,
            },
            "video session closed; visit already handled",
          );
          res.status(200).json({ status: "already_processed" });
          return;
        }

        // Q4 (A4): primero se cierra la visita, después los SMS.
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

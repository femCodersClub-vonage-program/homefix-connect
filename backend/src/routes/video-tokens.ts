import { Router } from "express";
import { z } from "zod";

import {
  rateLimitByUser,
  type RateLimitOptions,
} from "../middleware/rateLimitByUser.js";
import type { IncidentRepo } from "../repositories/incident.repo.js";
import type { VideoSessionRepo } from "../repositories/video-session.repo.js";
import type { VideoService } from "../services/video.service.js";

export type VideoTokensDeps = {
  incidentRepo: IncidentRepo;
  videoSessionRepo: VideoSessionRepo;
  videoService: VideoService;
  applicationId: string | undefined;
  /** E0-04: límite de peticiones por usuario (X-User-Id). */
  rateLimit: RateLimitOptions;
};

// Express pasa los nombres de las cabeceras a minúsculas.
const headersSchema = z.object({
  "x-user-id": z.string().trim().min(1),
  "x-user-role": z.enum(["TENANT", "TECHNICIAN", "MANAGER"]),
});

const bodySchema = z.object({
  incidentId: z.string().trim().min(1),
});

export function createVideoTokensRouter(deps: VideoTokensDeps) {
  const { incidentRepo, videoSessionRepo, videoService, applicationId, rateLimit } =
    deps;
  const router = Router();

  // Guard: si llegan dos peticiones a la vez para la misma VideoSession sin
  // vonageSessionId, solo la primera crea la sala de Vonage; la segunda reutiliza
  // esa misma promesa y recibe el mismo id. La promesa se queda guardada al
  // terminar bien (así una petición que leyó la BD antes del update tampoco crea
  // otra sala) y se borra si falla, para poder reintentar. Vive en memoria del
  // proceso: suficiente para el MVP con una sola instancia del backend.
  const pendingCreations = new Map<string, Promise<string>>();

  function ensureVonageSession(
    videoSessionId: string,
    visitId: string,
  ): Promise<string> {
    const pending = pendingCreations.get(videoSessionId);
    if (pending) return pending;

    const creation = (async () => {
      const { sessionId } = await videoService.createSession(visitId);
      await videoSessionRepo.update(videoSessionId, {
        vonageSessionId: sessionId,
      });
      return sessionId;
    })();

    creation.catch(() => {
      pendingCreations.delete(videoSessionId);
    });

    pendingCreations.set(videoSessionId, creation);
    return creation;
  }

  // E0-04: el límite va antes de todo; cuenta cualquier petición con X-User-Id (Q3).
  router.post("/video-tokens", rateLimitByUser(rateLimit), async (req, res, next) => {
    try {
      // 400 · formato de cabeceras y body
      const headers = headersSchema.safeParse(req.headers);
      const body = bodySchema.safeParse(req.body);

      if (!headers.success || !body.success) {
        res.status(400).json({
          error: "Cabeceras X-User-Id / X-User-Role o incidentId inválidos",
        });
        return;
      }

      const userId = headers.data["x-user-id"];
      const role = headers.data["x-user-role"];
      const { incidentId } = body.data;

      // 404 · la incidencia existe
      const incident = await incidentRepo.findById(incidentId);

      if (!incident) {
        res.status(404).json({ error: "La incidencia no existe" });
        return;
      }

      // 403 · es la inquilina o la técnica de ESTA incidencia, con su rol
      const isTenant = role === "TENANT" && incident.tenantId === userId;
      const isTechnician =
        role === "TECHNICIAN" && incident.technicianId === userId;

      if (!isTenant && !isTechnician) {
        res.status(403).json({
          error: "No tienes permiso para entrar en esta videollamada",
        });
        return;
      }

      // 409 · estados de incidencia, visita y sesión
      const visit = incident.visit;
      const session = visit?.videoSession;

      if (
        incident.status !== "VISIT_ASSIGNED" ||
        !visit ||
        visit.status !== "CONFIRMED" ||
        !session ||
        session.status === "ENDED"
      ) {
        res.status(409).json({
          error: "La visita no está disponible para la videollamada",
        });
        return;
      }

      // 500 · falta configuración
      if (!applicationId) {
        throw new Error("VONAGE_APPLICATION_ID no está configurado");
      }

      // Primer acceso (lazy-create): se crea la sala de Vonage y se guarda su id
      const vonageSessionId =
        session.vonageSessionId ??
        (await ensureVonageSession(session.id, visit.id));

      // Token personal para esta persona y este rol
      const { token } = await videoService.generateToken(vonageSessionId, role);

      // La primera entrada pasa la sesión a ACTIVE
      if (session.status === "PENDING") {
        await videoSessionRepo.update(session.id, {
          status: "ACTIVE",
          startedAt: new Date(),
        });
      }

      res.json({ applicationId, sessionId: vonageSessionId, token });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

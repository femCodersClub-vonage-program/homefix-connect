import { Router } from "express";
import { z } from "zod";

import { verifyVonageSignature } from "../middleware/verifyVonageSignature.js";
import type { NotificationStatusService } from "../services/notification-status.service.js";

// E2-01 · Webhook de estado de entrega de Vonage Messages (B4).
// Spec: specs/features/E2-01-message-status/02-specification.md
// Contrato: POST /api/webhooks/message-status (E1-01).

export type MessageStatusDeps = {
  notificationStatusService: Pick<NotificationStatusService, "applyStatus">;
  /** Por defecto, el secreto de `env` (X3). Los tests inyectan uno. */
  getSignatureSecret?: () => string | undefined;
};

// Vonage manda más campos (to, from, channel, usage…); solo usamos estos.
// Vonage a veces manda `error.title` como código numérico (p. ej. 1340).
const errorText = z.union([z.string(), z.number()]).transform(String);

const eventSchema = z.object({
  message_uuid: z.string().trim().min(1),
  status: z.string().trim().min(1),
  timestamp: z.string().min(1),
  error: z
    .object({
      title: errorText.optional(),
      detail: errorText.optional(),
    })
    .optional(),
});

export function createMessageStatusRouter({
  notificationStatusService,
  getSignatureSecret,
}: MessageStatusDeps) {
  const router = Router();

  router.post(
    "/webhooks/message-status",
    verifyVonageSignature(getSignatureSecret),
    async (req, res, next) => {
      try {
        const parsed = eventSchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({ error: "Invalid payload" });
          return;
        }
        const { message_uuid, status, timestamp, error } = parsed.data;

        // Un fallo de BD lanza → errorHandler → 500, y Vonage reintenta.
        const result = await notificationStatusService.applyStatus({
          messageUuid: message_uuid,
          status,
          timestamp,
          error,
        });

        res.status(200).json({ status: result });
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}

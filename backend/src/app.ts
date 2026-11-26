import cors from 'cors';
import express from 'express';
import type { ErrorRequestHandler, RequestHandler } from 'express';
import { pinoHttp } from 'pino-http';

import { env } from './config/env.js';
import { prisma } from './db/client.js';
import { logger } from './lib/logger.js';
import type { RateLimitOptions } from './middleware/rateLimitByUser.js';
import { captureRawBody } from './lib/rawBody.js';
import type { IncidentRepo } from './repositories/incident.repo.js';
import type { NotificationRepo } from './repositories/notification.repo.js';
import { PrismaIncidentRepo } from './repositories/prisma-incident.repo.js';
import { PrismaNotificationRepo } from './repositories/prisma-notification.repo.js';
import { PrismaVideoSessionRepo } from './repositories/prisma-video-session.repo.js';
import type { VideoSessionRepo } from './repositories/video-session.repo.js';
import { healthRouter } from './routes/health.js';
import { createIncidentsRouter } from './routes/incidents.js';
import { createNotificationsRouter } from './routes/notifications.js';
import { createMessageStatusRouter } from './routes/message-status.js';
import { createVideoEventsRouter } from './routes/video-events.js';
import { createVideoTokensRouter } from './routes/video-tokens.js';
import {
  createVonageMessagesClient,
  MessagingPostVisitNotifier,
  type PostVisitNotifier,
} from './services/messaging.service.js';
import { NotificationStatusService } from './services/notification-status.service.js';
import type { VideoService } from './services/video.service.js';
import { createVonageVideoService } from './services/vonage-video.service.js';

// Dependencias opcionales: los tests inyectan stubs; la app real usa los valores por defecto.
export type AppDeps = {
  incidentRepo?: IncidentRepo;
  videoSessionRepo?: VideoSessionRepo;
  videoService?: VideoService;
  applicationId?: string;
  /** A4: aviso post-visita (SMS + Notification). */
  postVisitNotifier?: PostVisitNotifier;
  /** A4: secreto de firma de webhooks (los tests inyectan uno). */
  getSignatureSecret?: () => string | undefined;
  /** E2-01: repo de notificaciones (los tests inyectan uno en memoria). */
  notificationRepo?: NotificationRepo;
  /** E0-04: límite de POST /video-tokens (los tests inyectan uno con reloj falso). */
  videoTokensRateLimit?: RateLimitOptions;
};

export function createApp(deps: AppDeps = {}) {
  const incidentRepo = deps.incidentRepo ?? new PrismaIncidentRepo(prisma);
  const videoSessionRepo =
    deps.videoSessionRepo ?? new PrismaVideoSessionRepo(prisma);
  // Vonage Video real (A2). Sin credenciales arranca igual: solo falla al pedir token (500).
  const videoService =
    deps.videoService ??
    createVonageVideoService({
      applicationId: env.VONAGE_APPLICATION_ID,
      privateKeyPath: env.VONAGE_PRIVATE_KEY_PATH,
    });
  const applicationId = deps.applicationId ?? env.VONAGE_APPLICATION_ID;
  const notificationRepo =
    deps.notificationRepo ?? new PrismaNotificationRepo(prisma);
  // A4: B1 (cliente Vonage Messages) + B2/B3 (sendPostVisit + Notification).
  // Sin credenciales arranca igual: los SMS quedan en FAILED.
  const postVisitNotifier =
    deps.postVisitNotifier ??
    new MessagingPostVisitNotifier({
      messaging: createVonageMessagesClient({
        applicationId: env.VONAGE_APPLICATION_ID,
        privateKeyPath: env.VONAGE_PRIVATE_KEY_PATH,
        from: env.VONAGE_MESSAGES_FROM,
      }),
      incidentRepo,
      notificationRepo,
    });

  const app = express();

  app.disable('x-powered-by');
  app.use(cors());
  app.use(express.json({ limit: '1mb', verify: captureRawBody }));
  app.use(pinoHttp({ logger }));

  app.get('/', (_req, res) => {
    res.json({
      name: 'homefix-connect-api',
      version: '0.1.0',
      docs: 'docs/MVP_DEFINITION.md',
    });
  });

  app.use('/api', healthRouter);
  app.use('/api', createIncidentsRouter({ incidentRepo }));
  app.use(
    '/api',
    createVideoTokensRouter({
      incidentRepo,
      videoSessionRepo,
      videoService,
      applicationId,
      rateLimit: deps.videoTokensRateLimit ?? {
        max: env.VIDEO_TOKENS_RATE_LIMIT_MAX,
        windowMs: env.VIDEO_TOKENS_RATE_LIMIT_WINDOW_MS,
      },
    }),
  );

  app.use(
    '/api',
    createVideoEventsRouter({
      incidentRepo,
      videoSessionRepo,
      postVisitNotifier,
      getSignatureSecret: deps.getSignatureSecret,
    }),
  );

  // E2-01: estados de entrega de los SMS (B4).
  app.use(
    '/api',
    createMessageStatusRouter({
      notificationStatusService: new NotificationStatusService(notificationRepo),
      getSignatureSecret: deps.getSignatureSecret,
    }),
  );

  // E3-01: SMS de la incidencia (participantes), sin teléfonos.
  app.use('/api', createNotificationsRouter({ incidentRepo, notificationRepo }));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.path });
};

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  logger.error({ err }, 'unhandled request error');
  res.status(500).json({ error: 'Internal Server Error' });
};
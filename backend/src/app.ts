import cors from 'cors';
import express from 'express';
import type { ErrorRequestHandler, RequestHandler } from 'express';
import { pinoHttp } from 'pino-http';

import { env } from './config/env.js';
import { prisma } from './db/client.js';
import { logger } from './lib/logger.js';
import { captureRawBody } from './lib/rawBody.js';
import type { IncidentRepo } from './repositories/incident.repo.js';
import { PrismaIncidentRepo } from './repositories/prisma-incident.repo.js';
import { PrismaVideoSessionRepo } from './repositories/prisma-video-session.repo.js';
import type { VideoSessionRepo } from './repositories/video-session.repo.js';
import { healthRouter } from './routes/health.js';
import { incidentsRouter } from './routes/incidents.js';
import { createVideoTokensRouter } from './routes/video-tokens.js';
import type { VideoService } from './services/video.service.js';
import { createVonageVideoService } from './services/vonage-video.service.js';

// Dependencias opcionales: los tests inyectan stubs; la app real usa los valores por defecto.
export type AppDeps = {
  incidentRepo?: IncidentRepo;
  videoSessionRepo?: VideoSessionRepo;
  videoService?: VideoService;
  applicationId?: string;
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
  app.use('/api', incidentsRouter);
  app.use(
    '/api',
    createVideoTokensRouter({
      incidentRepo,
      videoSessionRepo,
      videoService,
      applicationId,
    }),
  );

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
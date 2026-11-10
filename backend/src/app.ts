import cors from 'cors';
import express from 'express';
import type { ErrorRequestHandler, RequestHandler } from 'express';
import { pinoHttp } from 'pino-http';

import { logger } from './lib/logger.js';
import { healthRouter } from './routes/health.js';
import { incidentsRouter } from './routes/incidents.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
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

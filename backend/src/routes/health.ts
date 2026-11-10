import { Router } from 'express';

export const healthRouter = Router();

/**
 * Smoke check sin dependencias: sirve para CI, para el proxy del frontend y
 * para verificar que el proceso está vivo antes de tocar Postgres o Vonage.
 */
healthRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

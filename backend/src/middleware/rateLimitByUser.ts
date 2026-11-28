import type { RequestHandler } from 'express';

import { logger } from '../lib/logger.js';

// E0-04 · Rate limit por usuario (X-User-Id) con ventana fija y store en memoria.
// Spec: specs/features/E0-04-rate-limit/02-specification.md
//
// Por usuario y no por IP: con ngrok todas las peticiones llegan desde la misma IP.
// En memoria del proceso: suficiente para el MVP con una sola instancia del backend.

export type RateLimitOptions = {
  /** Peticiones permitidas por ventana. */
  max: number;
  /** Duración de la ventana en milisegundos. */
  windowMs: number;
  /** Reloj inyectable para los tests. */
  now?: () => number;
};

type Window = { count: number; resetAt: number };

export function rateLimitByUser({
  max,
  windowMs,
  now = Date.now,
}: RateLimitOptions): RequestHandler {
  const windows = new Map<string, Window>();

  return (req, res, next) => {
    const userId = req.header('x-user-id')?.trim();

    // Sin usuario no hay nada que limitar: la ruta responde 400 (Q2).
    if (!userId) {
      next();
      return;
    }

    const current = now();
    let window = windows.get(userId);

    if (!window || current >= window.resetAt) {
      window = { count: 0, resetAt: current + windowMs };
      windows.set(userId, window);
    }

    window.count += 1;

    if (window.count > max) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((window.resetAt - current) / 1000),
      );
      logger.warn({ userId, path: req.path }, 'rate limit exceeded');
      res.set('Retry-After', String(retryAfterSeconds));
      res.status(429).json({ error: 'Demasiadas peticiones, inténtalo más tarde' });
      return;
    }

    next();
  };
}

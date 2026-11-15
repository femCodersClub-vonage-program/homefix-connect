import type { RequestHandler } from 'express';

import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { checkVonageSignature } from '../lib/vonageSignature.js';

const BEARER = /^Bearer\s+(\S+)$/i;

/**
 * Rechaza los webhooks que no vienen firmados por Vonage. Se monta delante del
 * handler: `router.post('/webhooks/...', verifyVonageSignature(), handler)`.
 *
 * El secreto se lee en cada petición para que un `.env` sin configurar
 * responda con un error claro en vez de impedir el arranque.
 */
export function verifyVonageSignature(
  getSecret: () => string | undefined = () => env.VONAGE_SIGNATURE_SECRET,
): RequestHandler {
  return (req, res, next) => {
    const secret = getSecret();
    if (!secret) {
      logger.error({ path: req.path }, 'webhook signature secret not configured');
      res.status(500).json({ error: 'Webhook signature secret not configured' });
      return;
    }

    const token = BEARER.exec(req.get('authorization') ?? '')?.[1];
    const result = token
      ? checkVonageSignature(token, req.rawBody ?? Buffer.alloc(0), secret)
      : ({ valid: false, reason: 'missing_token' } as const);

    if (!result.valid) {
      logger.warn({ path: req.path, reason: result.reason }, 'webhook signature rejected');
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }

    next();
  };
}

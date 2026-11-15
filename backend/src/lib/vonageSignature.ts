import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

import { z } from 'zod';

/**
 * Vonage firma los webhooks de Messages y Video con un JWT HS256 (cabecera
 * `Authorization: Bearer`) usando el secreto de firma, e incluye el SHA-256 del
 * cuerpo en el claim `payload_hash`.
 * https://developer.vonage.com/en/getting-started/concepts/webhooks
 */

export type SignatureFailure =
  | 'malformed_token'
  | 'unsupported_alg'
  | 'bad_signature'
  | 'payload_mismatch';

export type SignatureCheck =
  | { valid: true }
  | { valid: false; reason: SignatureFailure };

const jwtHeaderSchema = z.object({ alg: z.string() });
const jwtClaimsSchema = z.object({ payload_hash: z.string().min(1) });

function decodeJson(segment: string): unknown {
  try {
    return JSON.parse(Buffer.from(segment, 'base64url').toString('utf8'));
  } catch {
    return undefined;
  }
}

function safeEqual(a: Buffer, b: Buffer): boolean {
  // timingSafeEqual lanza si las longitudes difieren.
  return a.length === b.length && timingSafeEqual(a, b);
}

export function checkVonageSignature(
  token: string,
  rawBody: Buffer,
  secret: string,
): SignatureCheck {
  const parts = token.split('.');
  if (parts.length !== 3) return { valid: false, reason: 'malformed_token' };
  const [encodedHeader, encodedClaims, encodedSignature] = parts as [
    string,
    string,
    string,
  ];

  const header = jwtHeaderSchema.safeParse(decodeJson(encodedHeader));
  if (!header.success) return { valid: false, reason: 'malformed_token' };
  // Fijar el algoritmo evita ataques con `alg: none` o cambio de algoritmo.
  if (header.data.alg !== 'HS256') {
    return { valid: false, reason: 'unsupported_alg' };
  }

  const expected = createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedClaims}`)
    .digest();
  if (!safeEqual(Buffer.from(encodedSignature, 'base64url'), expected)) {
    return { valid: false, reason: 'bad_signature' };
  }

  const claims = jwtClaimsSchema.safeParse(decodeJson(encodedClaims));
  if (!claims.success) return { valid: false, reason: 'malformed_token' };

  const bodyHash = createHash('sha256').update(rawBody).digest('hex');
  if (!safeEqual(Buffer.from(claims.data.payload_hash.toLowerCase()), Buffer.from(bodyHash))) {
    return { valid: false, reason: 'payload_mismatch' };
  }

  return { valid: true };
}

import { createHash, createHmac } from 'node:crypto';

export const TEST_SECRET = 'test-signature-secret-not-real';

const encode = (value: unknown) =>
  Buffer.from(JSON.stringify(value)).toString('base64url');

export const sha256Hex = (body: string) =>
  createHash('sha256').update(body).digest('hex');

/**
 * Firma un JWT como lo haría Vonage para un webhook: HS256 con el secreto de
 * firma y el SHA-256 del cuerpo en `payload_hash`.
 */
export function signVonageJwt(
  body: string,
  {
    secret = TEST_SECRET,
    header = { alg: 'HS256', typ: 'JWT' },
    claims = { payload_hash: sha256Hex(body) },
  }: {
    secret?: string;
    header?: Record<string, unknown>;
    claims?: Record<string, unknown>;
  } = {},
): string {
  const signingInput = `${encode(header)}.${encode({
    iat: 1_700_000_000,
    jti: 'test-jti',
    iss: 'Vonage',
    api_key: 'test-api-key',
    ...claims,
  })}`;
  const signature = createHmac('sha256', secret)
    .update(signingInput)
    .digest('base64url');
  return `${signingInput}.${signature}`;
}

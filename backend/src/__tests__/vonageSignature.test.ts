import { describe, expect, it } from 'vitest';

import { checkVonageSignature } from '../lib/vonageSignature.js';
import { TEST_SECRET, signVonageJwt } from './helpers/vonageJwt.js';

const body = JSON.stringify({ event: 'sessionDestroyed', sessionId: 'vs_demo' });

describe('checkVonageSignature', () => {
  it('acepta un JWT firmado con el secreto correcto y payload_hash del cuerpo', () => {
    const token = signVonageJwt(body);

    expect(checkVonageSignature(token, Buffer.from(body), TEST_SECRET)).toEqual({
      valid: true,
    });
  });

  it('rechaza un JWT firmado con otro secreto', () => {
    const token = signVonageJwt(body, { secret: 'otro-secreto' });

    expect(checkVonageSignature(token, Buffer.from(body), TEST_SECRET)).toEqual({
      valid: false,
      reason: 'bad_signature',
    });
  });

  it('rechaza un JWT cuya firma se ha manipulado', () => {
    const token = signVonageJwt(body);
    const tampered = `${token.slice(0, -2)}xx`;

    expect(checkVonageSignature(tampered, Buffer.from(body), TEST_SECRET)).toMatchObject({
      valid: false,
    });
  });

  it('rechaza cuando el cuerpo no coincide con payload_hash', () => {
    const token = signVonageJwt(body);
    const altered = body.replace('vs_demo', 'vs_otro');

    expect(checkVonageSignature(token, Buffer.from(altered), TEST_SECRET)).toEqual({
      valid: false,
      reason: 'payload_mismatch',
    });
  });

  it('rechaza un JWT sin payload_hash', () => {
    const token = signVonageJwt(body, { claims: { payload_hash: undefined } });

    expect(checkVonageSignature(token, Buffer.from(body), TEST_SECRET)).toEqual({
      valid: false,
      reason: 'malformed_token',
    });
  });

  it.each(['none', 'HS512', 'RS256'])('rechaza el algoritmo %s', (alg) => {
    const token = signVonageJwt(body, { header: { alg, typ: 'JWT' } });

    expect(checkVonageSignature(token, Buffer.from(body), TEST_SECRET)).toEqual({
      valid: false,
      reason: 'unsupported_alg',
    });
  });

  it.each([
    ['vacío', ''],
    ['sin puntos', 'abc'],
    ['con dos partes', 'abc.def'],
    ['con cuatro partes', 'a.b.c.d'],
    ['con header que no es JSON', 'bm90LWpzb24.e30.sig'],
  ])('rechaza un token mal formado (%s)', (_label, token) => {
    expect(checkVonageSignature(token, Buffer.from(body), TEST_SECRET)).toEqual({
      valid: false,
      reason: 'malformed_token',
    });
  });

  it('acepta un cuerpo vacío si payload_hash es el de la cadena vacía', () => {
    const token = signVonageJwt('');

    expect(checkVonageSignature(token, Buffer.alloc(0), TEST_SECRET)).toEqual({
      valid: true,
    });
  });
});

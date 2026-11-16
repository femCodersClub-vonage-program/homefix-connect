import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { captureRawBody } from '../lib/rawBody.js';
import { verifyVonageSignature } from '../middleware/verifyVonageSignature.js';
import { TEST_SECRET, signVonageJwt } from './helpers/vonageJwt.js';

function buildApp(secret: string | undefined) {
  const handler = vi.fn((_req: express.Request, res: express.Response) => {
    res.status(200).json({ ok: true });
  });
  const app = express();
  app.use(express.json({ verify: captureRawBody }));
  app.post('/webhook', verifyVonageSignature(() => secret), handler);
  return { app, handler };
}

const body = JSON.stringify({ status: 'delivered', message_uuid: 'msg-1' });

describe('verifyVonageSignature (middleware)', () => {
  it('deja pasar un webhook con firma válida', async () => {
    const { app, handler } = buildApp(TEST_SECRET);

    const res = await request(app)
      .post('/webhook')
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${signVonageJwt(body)}`)
      .send(body);

    expect(res.status).toBe(200);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('acepta el esquema bearer en minúsculas', async () => {
    const { app } = buildApp(TEST_SECRET);

    const res = await request(app)
      .post('/webhook')
      .set('Content-Type', 'application/json')
      .set('Authorization', `bearer ${signVonageJwt(body)}`)
      .send(body);

    expect(res.status).toBe(200);
  });

  it('devuelve 401 si falta la cabecera Authorization', async () => {
    const { app, handler } = buildApp(TEST_SECRET);

    const res = await request(app)
      .post('/webhook')
      .set('Content-Type', 'application/json')
      .send(body);

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Invalid signature' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('devuelve 401 si la cabecera no es Bearer', async () => {
    const { app } = buildApp(TEST_SECRET);

    const res = await request(app)
      .post('/webhook')
      .set('Content-Type', 'application/json')
      .set('Authorization', `Basic ${signVonageJwt(body)}`)
      .send(body);

    expect(res.status).toBe(401);
  });

  it('devuelve 401 si el JWT está firmado con otro secreto', async () => {
    const { app, handler } = buildApp(TEST_SECRET);

    const res = await request(app)
      .post('/webhook')
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${signVonageJwt(body, { secret: 'otro' })}`)
      .send(body);

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Invalid signature' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('devuelve 401 si el cuerpo se alteró después de firmar', async () => {
    const { app, handler } = buildApp(TEST_SECRET);

    const res = await request(app)
      .post('/webhook')
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${signVonageJwt(body)}`)
      .send(body.replace('delivered', 'failed'));

    expect(res.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it('hashea el cuerpo original, no el JSON re-serializado', async () => {
    const { app } = buildApp(TEST_SECRET);
    const spaced = '{ "status": "delivered" }';

    const res = await request(app)
      .post('/webhook')
      .set('Content-Type', 'application/json')
      .set('Authorization', `Bearer ${signVonageJwt(spaced)}`)
      .send(spaced);

    expect(res.status).toBe(200);
  });

  it.each([undefined, ''])(
    'devuelve 500 y no deja pasar si el secreto no está configurado (%j)',
    async (secret) => {
      const { app, handler } = buildApp(secret);

      const res = await request(app)
        .post('/webhook')
        .set('Content-Type', 'application/json')
        .set('Authorization', `Bearer ${signVonageJwt(body)}`)
        .send(body);

      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: 'Webhook signature secret not configured' });
      expect(handler).not.toHaveBeenCalled();
    },
  );
});

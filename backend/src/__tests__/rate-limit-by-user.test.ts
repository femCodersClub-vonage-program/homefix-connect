import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { rateLimitByUser } from '../middleware/rateLimitByUser.js';

// E0-04 · rateLimitByUser: ventana fija por X-User-Id, sin Express real de la app.
// Spec: specs/features/E0-04-rate-limit/02-specification.md

function setup(max = 2, windowMs = 60_000) {
  let clock = 1_000_000;
  const app = express();
  app.post(
    '/limited',
    rateLimitByUser({ max, windowMs, now: () => clock }),
    (_req, res) => {
      res.json({ ok: true });
    },
  );
  return {
    app,
    advance(ms: number) {
      clock += ms;
    },
  };
}

function hit(app: express.Express, userId?: string) {
  const req = request(app).post('/limited');
  return userId === undefined ? req : req.set('X-User-Id', userId);
}

describe('rateLimitByUser', () => {
  it('RL-1 · deja pasar hasta `max` peticiones en la ventana', async () => {
    const { app } = setup(2);

    expect((await hit(app, 'usr_a')).status).toBe(200);
    expect((await hit(app, 'usr_a')).status).toBe(200);
  });

  it('RL-2 · la petición `max + 1` recibe 429 con { error } y Retry-After', async () => {
    const { app, advance } = setup(2, 60_000);
    await hit(app, 'usr_a');
    await hit(app, 'usr_a');
    advance(15_000);

    const res = await hit(app, 'usr_a');

    expect(res.status).toBe(429);
    expect(res.body).toEqual({ error: expect.any(String) });
    expect(res.headers['retry-after']).toBe('45');
  });

  it('RL-3 · al acabar la ventana se reinicia el contador', async () => {
    const { app, advance } = setup(1, 60_000);
    await hit(app, 'usr_a');
    expect((await hit(app, 'usr_a')).status).toBe(429);

    advance(60_000);

    expect((await hit(app, 'usr_a')).status).toBe(200);
  });

  it('RL-4 · cada usuario tiene su propio contador', async () => {
    const { app } = setup(1);
    await hit(app, 'usr_a');

    expect((await hit(app, 'usr_a')).status).toBe(429);
    expect((await hit(app, 'usr_b')).status).toBe(200);
  });

  it('RL-5 · sin X-User-Id (o vacío) no se limita: pasa a la ruta', async () => {
    const { app } = setup(1);

    for (let i = 0; i < 3; i++) {
      expect((await hit(app)).status).toBe(200);
      expect((await hit(app, '   ')).status).toBe(200);
    }
  });

  it('RL-6 · Retry-After nunca es menor que 1 segundo', async () => {
    const { app, advance } = setup(1, 60_000);
    await hit(app, 'usr_a');
    advance(59_999);

    const res = await hit(app, 'usr_a');

    expect(res.status).toBe(429);
    expect(res.headers['retry-after']).toBe('1');
  });
});

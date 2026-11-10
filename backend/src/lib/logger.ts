import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import pino from 'pino';

import { env } from '../config/env.js';

// Observabilidad del MVP: logs estructurados a archivo JSONL (sin APM).
// Decisión: docs/SDD_PLAN.md §5.
const logFile = resolve(process.cwd(), 'logs/app.jsonl');
mkdirSync(dirname(logFile), { recursive: true });

export const logFilePath = logFile;

const streams: Parameters<typeof pino.multistream>[0] = [
  {
    level: env.LOG_LEVEL,
    stream: pino.destination({ dest: logFile, sync: true }),
  },
];

// En tests no ensuciamos la salida; en local, además del archivo, escribimos a
// stdout para ver los logs mientras se desarrolla.
if (env.NODE_ENV !== 'test') {
  streams.push({ level: env.LOG_LEVEL, stream: process.stdout });
}

export const logger = pino(
  { level: env.LOG_LEVEL, base: { service: 'homefix-api' } },
  pino.multistream(streams),
);

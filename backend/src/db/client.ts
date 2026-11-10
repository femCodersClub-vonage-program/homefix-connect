import { PrismaClient } from '@prisma/client';

import { env } from '../config/env.js';

declare global {
  var __homefixPrisma: PrismaClient | undefined;
}

// Una sola instancia por proceso: con `tsx watch` los hot reloads recrean el
// módulo y sin esto se acumulan conexiones a Postgres.
export const prisma = globalThis.__homefixPrisma ?? new PrismaClient();

if (env.NODE_ENV !== 'production') {
  globalThis.__homefixPrisma = prisma;
}

import 'dotenv/config';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

// `pnpm dev` ejecuta con cwd = backend/. Soportamos también un .env en la raíz
// del monorepo para que haya un único archivo de entorno compartido.
for (const candidate of [
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), '../.env'),
]) {
  if (existsSync(candidate)) {
    loadEnv({ path: candidate, override: false });
    break;
  }
}

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  DATABASE_URL: z
    .string()
    .min(1)
    .default('postgresql://homefix:homefix@localhost:5432/homefix?schema=public'),

  // Vonage: opcionales en el scaffold. Las tareas que las usen deben validar
  // su presencia en el momento de usarlas (ver A1/A2/B1).
  // E0-06: fuera VONAGE_API_KEY/SECRET (Video y Messages usan applicationId +
  // clave privada), *_PHONE (los teléfonos salen de User.phone en la BD) y
  // WEBHOOK_BASE_URL (la URL de ngrok se configura en el dashboard de Vonage).
  VONAGE_APPLICATION_ID: z.string().optional(),
  VONAGE_PRIVATE_KEY_PATH: z.string().optional(),
  VONAGE_MESSAGES_FROM: z.string().optional(),
  VONAGE_SIGNATURE_SECRET: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  throw new Error(`Configuración de entorno inválida:\n${issues}`);
}

export const env = parsed.data;
export type Env = typeof env;

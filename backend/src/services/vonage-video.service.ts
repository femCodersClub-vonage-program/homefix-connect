import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import type { Role } from '@prisma/client';
import { Vonage } from '@vonage/server-sdk';

import type { VideoService } from './video.service.js';

// A2 · Implementación real de VideoService con el Server SDK de Vonage Video.
// Spec: specs/features/A2-video-service/02-specification.md
// Solo habla con Vonage: guardar el vonageSessionId y el guard de concurrencia
// son de la ruta POST /api/video-tokens (A3, decisión P3 del issue #9).

/** Lo mínimo que usamos del SDK (`vonage.video`). Se inyecta para mockearlo en tests. */
export type VonageVideoClient = {
  createSession(options: {
    mediaMode: typeof MEDIA_MODE_RELAYED;
  }): Promise<{ sessionId: string }>;
  generateClientToken(
    sessionId: string,
    options: { role: string; expireTime: number; data: string },
  ): string;
};

// En @vonage/video, MediaMode.RELAYED === 'enabled' (media P2P). El SDK usa ROUTED
// por defecto, así que hay que pasarlo siempre. @vonage/server-sdk no reexporta el enum.
const MEDIA_MODE_RELAYED = 'enabled' as const;

// Rol de Vonage por rol de la app. Llamada 1-a-1: nadie modera (Q4).
const VONAGE_ROLE_BY_ROLE: Partial<Record<Role, string>> = {
  TENANT: 'publisher',
  TECHNICIAN: 'publisher',
};

const DEFAULT_TTL_SECONDS = 3600; // 1 h (Q2)

export type VonageVideoServiceOptions = {
  client: VonageVideoClient;
  ttlSeconds?: number;
  now?: () => number;
};

export class VonageVideoService implements VideoService {
  private readonly client: VonageVideoClient;
  private readonly ttlSeconds: number;
  private readonly now: () => number;

  constructor(options: VonageVideoServiceOptions) {
    this.client = options.client;
    this.ttlSeconds = options.ttlSeconds ?? DEFAULT_TTL_SECONDS;
    this.now = options.now ?? (() => Date.now());
  }

  // visitId no se envía a Vonage: la relación visita ↔ sesión la guarda A3 en VideoSession.
  async createSession(_visitId: string): Promise<{ sessionId: string }> {
    const { sessionId } = await this.client.createSession({
      mediaMode: MEDIA_MODE_RELAYED,
    });
    return { sessionId };
  }

  async generateToken(
    sessionId: string,
    role: Role,
  ): Promise<{ token: string; expiresAt: Date }> {
    const vonageRole = VONAGE_ROLE_BY_ROLE[role];
    if (!vonageRole) {
      throw new Error(`El rol ${role} no puede entrar en la videollamada`);
    }

    // Vonage espera expireTime en SEGUNDOS (timestamp Unix).
    const expireTime = Math.floor(this.now() / 1000) + this.ttlSeconds;

    const token = this.client.generateClientToken(sessionId, {
      role: vonageRole,
      expireTime,
      // Identifica la conexión en el cliente (Q5, pendiente de confirmar).
      data: JSON.stringify({ role }),
    });

    return { token, expiresAt: new Date(expireTime * 1000) };
  }
}

export type VonageVideoConfig = {
  applicationId: string | undefined;
  privateKeyPath: string | undefined;
};

const MISSING_CREDENTIALS = 'Credenciales de Vonage Video no configuradas';

/**
 * Crea el VideoService real a partir de la config. Sin credenciales la app arranca
 * igual y solo fallan las llamadas (→ 500 en la ruta, Q3). El SDK se instancia
 * en la primera llamada. Nunca se loguea la clave privada.
 */
export function createVonageVideoService(
  config: VonageVideoConfig,
): VideoService {
  const { applicationId, privateKeyPath } = config;

  let sdkClient: VonageVideoClient | undefined;

  function getClient(): VonageVideoClient {
    if (!applicationId || !privateKeyPath) {
      throw new Error(MISSING_CREDENTIALS);
    }
    if (!sdkClient) {
      // Ojo: si la ruta no existe, el SDK usa el TEXTO de la ruta como clave y el
      // error sale después, al firmar, y es confuso. Por eso lo comprobamos antes.
      // La ruta relativa se resuelve desde donde corre el backend (backend/ con pnpm dev).
      const keyPath = resolve(privateKeyPath);
      if (!existsSync(keyPath)) {
        throw new Error(
          `No se encuentra el private.key de Vonage Video en ${keyPath}`,
        );
      }
      const video = new Vonage({ applicationId, privateKey: keyPath }).video;
      type SdkSessionOptions = Parameters<typeof video.createSession>[0];
      sdkClient = {
        createSession: (options) =>
          video.createSession(options as SdkSessionOptions),
        generateClientToken: (sessionId, options) =>
          video.generateClientToken(sessionId, options),
      };
    }
    return sdkClient;
  }

  // Adaptador perezoso: el error de credenciales sale al llamar, no al crear.
  const lazyClient: VonageVideoClient = {
    createSession: (options) => getClient().createSession(options),
    generateClientToken: (sessionId, options) =>
      getClient().generateClientToken(sessionId, options),
  };

  return new VonageVideoService({ client: lazyClient });
}

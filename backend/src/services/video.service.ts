import type { Role } from '@prisma/client';

export interface VideoService {
  createSession(visitId: string): Promise<{ sessionId: string }>;
  generateToken(
    sessionId: string,
    role: Role,
  ): Promise<{ token: string; expiresAt: Date }>;
}

/**
 * Stub en memoria: permite que los carriles A y C avancen sin Vonage real.
 * La implementación real llega en A1/A2 y debe cumplir esta misma interface.
 */
export class InMemoryVideoService implements VideoService {
  async createSession(visitId: string): Promise<{ sessionId: string }> {
    return { sessionId: `stub-session-${visitId}` };
  }

  async generateToken(
    sessionId: string,
    role: Role,
  ): Promise<{ token: string; expiresAt: Date }> {
    return {
      token: `stub-token-${role}-${sessionId}`,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    };
  }
}

import { postJson } from './client.js';
import type { components } from './generated/openapi.js';
import { userHeaders, type UserRole } from './incidents.js';

type Schemas = components['schemas'];

export type VideoTokenRequest = Schemas['VideoTokenRequest'];
export type VideoTokenResponse = Schemas['VideoTokenResponse'];

export function requestVideoToken(
  incidentId: string,
  role: UserRole,
): Promise<VideoTokenResponse> {
  return postJson<VideoTokenResponse, VideoTokenRequest>(
    '/api/video-tokens',
    { incidentId },
    { headers: userHeaders(role) },
  );
}

import { useMutation } from '@tanstack/react-query';

import type { UserRole } from '../api/incidents.js';
import {
  requestVideoToken,
  type VideoTokenResponse,
} from '../api/video.js';

export function useVideoToken(incidentId: string, role: UserRole) {
  return useMutation<VideoTokenResponse, Error, void>({
    mutationKey: ['video-token', incidentId, role],
    mutationFn: () => requestVideoToken(incidentId, role),
    retry: false,
  });
}

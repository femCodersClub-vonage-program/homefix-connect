import { useQuery } from '@tanstack/react-query';

import { getIncident, type UserRole } from '../api/incidents.js';

export function useIncident(incidentId: string, role: UserRole) {
  return useQuery({
    queryKey: ['incident', incidentId],
    queryFn: () => getIncident(incidentId, role),
  });
}

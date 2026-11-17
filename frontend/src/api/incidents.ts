import { getJson } from './http.js';

export type IncidentStatus =
  | 'REPORTED'
  | 'VISIT_ASSIGNED'
  | 'VIDEO_COMPLETED'
  | 'CLOSED';

export type VisitStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'CANCELLED';

export type UserRole = 'TENANT' | 'TECHNICIAN';

/**
 * Tipo provisional hasta que C1 genere el cliente desde `openapi.yaml` (T1).
 * Solo incluye el subconjunto que consume C2.
 */
export type IncidentDetailData = {
  id: string;
  title: string;
  description: string | null;
  status: IncidentStatus;
  technician: { name: string } | null;
  visit: { scheduledAt: string; status: VisitStatus } | null;
};

const demoUserIdByRole: Record<UserRole, string> = {
  TENANT: 'usr_tenant_demo',
  TECHNICIAN: 'usr_technician_demo',
};

export function getIncident(
  incidentId: string,
  role: UserRole,
): Promise<IncidentDetailData> {
  return getJson<IncidentDetailData>(
    `/api/incidents/${encodeURIComponent(incidentId)}`,
    {
      headers: {
        'X-User-Id': demoUserIdByRole[role],
        'X-User-Role': role,
      },
    },
  );
}

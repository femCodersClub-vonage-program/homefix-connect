import { getJson } from './client.js';
import type { components } from './generated/openapi.js';

type Schemas = components['schemas'];

export type Incident = Schemas['Incident'];
export type IncidentDetailData = Incident;
export type IncidentStatus = Schemas['IncidentStatus'];
export type VisitStatus = Schemas['VisitStatus'];
export type Role = Schemas['Role'];
export type UserRole = Extract<Role, 'TENANT' | 'TECHNICIAN'>;

const demoUserIdByRole: Record<UserRole, string> = {
  TENANT: 'usr_tenant_demo',
  TECHNICIAN: 'usr_technician_demo',
};

export function userHeaders(role: UserRole): Record<string, string> {
  return {
    'X-User-Id': demoUserIdByRole[role],
    'X-User-Role': role,
  };
}

export function getIncident(
  incidentId: string,
  role: UserRole,
): Promise<IncidentDetailData> {
  return getJson<IncidentDetailData>(
    `/api/incidents/${encodeURIComponent(incidentId)}`,
    { headers: userHeaders(role) },
  );
}

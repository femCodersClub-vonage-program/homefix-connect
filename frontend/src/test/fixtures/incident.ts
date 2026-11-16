import type { IncidentDetailData } from '../../api/incidents.js';

export function makeIncidentFixture(
  overrides: Partial<IncidentDetailData> = {},
): IncidentDetailData {
  return {
    id: 'inc_demo',
    title: 'Fuga de agua en el baño',
    description: 'La tubería pierde bajo el lavabo.',
    status: 'VISIT_ASSIGNED',
    technician: { name: 'Técnica Demo' },
    visit: { scheduledAt: '2026-11-17T10:00:00.000Z', status: 'CONFIRMED' },
    ...overrides,
  };
}

import IncidentDetail from './pages/IncidentDetail.js';

const DEFAULT_INCIDENT_ID = 'inc_demo';

export function getIncidentIdFromUrl(search: string): string {
  const params = new URLSearchParams(search);
  return params.get('incidentId') ?? DEFAULT_INCIDENT_ID;
}

export default function App() {
  return (
    <IncidentDetail incidentId={getIncidentIdFromUrl(window.location.search)} />
  );
}

import type { IncidentStatus, VisitStatus } from '../api/incidents.js';

type JoinButtonProps = {
  incidentStatus: IncidentStatus;
  visitStatus: VisitStatus | null;
  onClick?: () => void;
};

export function JoinButton({
  incidentStatus,
  visitStatus,
  onClick,
}: JoinButtonProps) {
  const canJoin =
    incidentStatus === 'VISIT_ASSIGNED' && visitStatus === 'CONFIRMED';

  let label = 'Videollamada no disponible';
  if (canJoin) {
    label = 'Entrar a la videollamada';
  } else if (incidentStatus === 'VIDEO_COMPLETED') {
    label = 'Visita realizada';
  }

  return (
    <button type="button" disabled={!canJoin} onClick={onClick}>
      {label}
    </button>
  );
}

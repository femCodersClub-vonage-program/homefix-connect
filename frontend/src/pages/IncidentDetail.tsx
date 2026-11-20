import { useState } from 'react';

import { HttpError } from '../api/client.js';
import type {
  IncidentStatus,
  UserRole,
  VisitStatus,
} from '../api/incidents.js';
import { JoinButton } from '../components/JoinButton.js';
import { VideoCall } from '../components/VideoCall.js';
import { useIncident } from '../hooks/useIncident.js';
import { useVideoToken } from '../hooks/useVideoToken.js';

const incidentStatusLabels: Record<IncidentStatus, string> = {
  REPORTED: 'Reportada',
  VISIT_ASSIGNED: 'Visita asignada',
  VIDEO_COMPLETED: 'Vídeo completado',
  CLOSED: 'Cerrada',
};

const visitStatusLabels: Record<VisitStatus, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
};

function formatScheduledAt(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Fecha no disponible';
  }

  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(date);
}

function videoTokenErrorMessage(error: Error): string {
  if (error instanceof HttpError && error.status === 403) {
    return 'No tienes permiso para entrar en esta videollamada.';
  }

  if (error instanceof HttpError && error.status === 404) {
    return 'Incidencia no encontrada.';
  }

  if (error instanceof HttpError && error.status === 409) {
    return 'La videollamada ya no está disponible.';
  }

  return 'No se pudo iniciar la videollamada.';
}

export default function IncidentDetail({ incidentId }: { incidentId: string }) {
  const [role, setRole] = useState<UserRole>('TENANT');
  const incident = useIncident(incidentId, role);
  const videoToken = useVideoToken(incidentId, role);

  function changeRole(nextRole: UserRole) {
    videoToken.reset();
    setRole(nextRole);
  }

  if (incident.isPending) {
    return <p>Cargando incidencia…</p>;
  }

  if (incident.isError) {
    const notFound =
      incident.error instanceof HttpError && incident.error.status === 404;

    return (
      <p className="error">
        {notFound
          ? 'Incidencia no encontrada'
          : 'No se pudo cargar la incidencia'}
      </p>
    );
  }

  const { data } = incident;

  return (
    <main className="app">
      <h1>{data.title}</h1>
      <p className="subtitle">{data.description ?? 'Sin descripción'}</p>

      <fieldset className="card">
        <legend>Rol</legend>
        <label>
          <input
            type="radio"
            name="role"
            value="TENANT"
            checked={role === 'TENANT'}
            disabled={videoToken.isPending || videoToken.isSuccess}
            onChange={() => changeRole('TENANT')}
          />{' '}
          Inquilina
        </label>
        <label>
          <input
            type="radio"
            name="role"
            value="TECHNICIAN"
            checked={role === 'TECHNICIAN'}
            disabled={videoToken.isPending || videoToken.isSuccess}
            onChange={() => changeRole('TECHNICIAN')}
          />{' '}
          Técnica
        </label>
      </fieldset>

      <section className="card">
        <h2>Incidencia</h2>
        <p>Estado: {incidentStatusLabels[data.status]}</p>
        <p>Técnica: {data.technician?.name ?? 'Sin asignar'}</p>
        {data.visit ? (
          <p>
            Visita: {formatScheduledAt(data.visit.scheduledAt)} ·{' '}
            {visitStatusLabels[data.visit.status]}
          </p>
        ) : (
          <p>Visita: Sin visita</p>
        )}
      </section>

      {videoToken.isError ? (
        <p className="error" role="alert">
          {videoTokenErrorMessage(videoToken.error)}
        </p>
      ) : null}

      {videoToken.data ? (
        <VideoCall
          applicationId={videoToken.data.applicationId}
          sessionId={videoToken.data.sessionId}
          token={videoToken.data.token}
        />
      ) : (
        <JoinButton
          incidentStatus={data.status}
          visitStatus={data.visit?.status ?? null}
          isConnecting={videoToken.isPending}
          onClick={() => videoToken.mutate()}
        />
      )}
    </main>
  );
}

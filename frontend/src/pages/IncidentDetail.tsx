import { useState } from 'react';

import { HttpError } from '../api/client.js';
import type {
  IncidentStatus,
  UserRole,
  VisitStatus,
} from '../api/incidents.js';
import { JoinButton } from '../components/JoinButton.js';
import { useIncident } from '../hooks/useIncident.js';

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

export default function IncidentDetail({ incidentId }: { incidentId: string }) {
  const [role, setRole] = useState<UserRole>('TENANT');
  const incident = useIncident(incidentId, role);

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
            onChange={() => setRole('TENANT')}
          />{' '}
          Inquilina
        </label>
        <label>
          <input
            type="radio"
            name="role"
            value="TECHNICIAN"
            checked={role === 'TECHNICIAN'}
            onChange={() => setRole('TECHNICIAN')}
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

      <JoinButton
        incidentStatus={data.status}
        visitStatus={data.visit?.status ?? null}
      />
    </main>
  );
}

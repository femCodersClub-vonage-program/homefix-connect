import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { IncidentDetailData } from '../api/incidents.js';
import { makeIncidentFixture } from '../test/fixtures/incident.js';
import IncidentDetail from './IncidentDetail.js';

function renderPage(incidentId = 'inc_demo') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <IncidentDetail incidentId={incidentId} />
    </QueryClientProvider>,
  );
}

function mockIncident(data: IncidentDetailData) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => data,
  });

  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('IncidentDetail', () => {
  it('muestra los datos y el botón habilitado con visita confirmada', async () => {
    mockIncident(makeIncidentFixture());
    renderPage();

    expect(
      await screen.findByRole('heading', { name: /fuga de agua/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/la tubería pierde/i)).toBeInTheDocument();
    expect(screen.getByText(/visita asignada/i)).toBeInTheDocument();
    expect(screen.getByText(/técnica demo/i)).toBeInTheDocument();
    expect(screen.getByText(/confirmada/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /entrar a la videollamada/i }),
    ).toBeEnabled();
  });

  it('deshabilita el botón con "Visita realizada" si la incidencia está VIDEO_COMPLETED', async () => {
    mockIncident(makeIncidentFixture({ status: 'VIDEO_COMPLETED' }));
    renderPage();

    const button = await screen.findByRole('button', {
      name: /visita realizada/i,
    });

    expect(button).toBeDisabled();
  });

  it('deshabilita el botón con "Videollamada no disponible" en otros estados', async () => {
    mockIncident(makeIncidentFixture({ status: 'REPORTED' }));
    renderPage();

    const button = await screen.findByRole('button', {
      name: /videollamada no disponible/i,
    });

    expect(button).toBeDisabled();
  });

  it('deshabilita el botón si no hay visita', async () => {
    mockIncident(makeIncidentFixture({ visit: null }));
    renderPage();

    expect(await screen.findByText(/sin visita/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /videollamada no disponible/i }),
    ).toBeDisabled();
  });

  it('muestra el estado de carga', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockReturnValue(new Promise(() => undefined)),
    );

    renderPage();

    expect(screen.getByText(/cargando incidencia/i)).toBeInTheDocument();
  });

  it('muestra "Incidencia no encontrada" cuando la API responde 404', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Incident not found' }),
      }),
    );

    renderPage();

    expect(
      await screen.findByText(/incidencia no encontrada/i),
    ).toBeInTheDocument();
  });

  it('muestra un error genérico cuando la petición falla', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    renderPage();

    expect(
      await screen.findByText(/no se pudo cargar la incidencia/i),
    ).toBeInTheDocument();
  });

  it('envía las cabeceras del rol por defecto (inquilina)', async () => {
    const fetchMock = mockIncident(makeIncidentFixture());
    renderPage();

    await screen.findByRole('heading', { name: /fuga de agua/i });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/incidents/inc_demo',
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-User-Id': 'usr_tenant_demo',
          'X-User-Role': 'TENANT',
        }),
      }),
    );
  });

  it('permite cambiar el rol a técnica', async () => {
    mockIncident(makeIncidentFixture());
    renderPage();

    await screen.findByRole('heading', { name: /fuga de agua/i });

    const technician = screen.getByRole('radio', { name: /técnica/i });
    fireEvent.click(technician);

    expect(technician).toBeChecked();
  });
});

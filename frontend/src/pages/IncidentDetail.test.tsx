import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { IncidentDetailData, IncidentStatus } from '../api/incidents.js';
import { FINISH_TOAST_MESSAGE } from '../components/FinishToast.js';
import { makeIncidentFixture } from '../test/fixtures/incident.js';
import IncidentDetail from './IncidentDetail.js';

vi.mock('../components/VideoCall.js', () => ({
  VideoCall: ({
    applicationId,
    sessionId,
    token,
  }: {
    applicationId: string;
    sessionId: string;
    token: string;
  }) => (
    <div data-testid="video-call">
      {applicationId}:{sessionId}:{token}
    </div>
  ),
}));

function renderPageWithClient(incidentId = 'inc_demo') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const rendered = render(
    <QueryClientProvider client={queryClient}>
      <IncidentDetail incidentId={incidentId} />
    </QueryClientProvider>,
  );

  return { ...rendered, queryClient };
}

function renderPage(incidentId = 'inc_demo') {
  return renderPageWithClient(incidentId);
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

function mockIncidentSequence(statuses: IncidentStatus[]) {
  let call = 0;

  const fetchMock = vi.fn().mockImplementation(() => {
    const status =
      statuses[Math.min(call, statuses.length - 1)] ?? 'VISIT_ASSIGNED';
    call += 1;

    return Promise.resolve({
      ok: true,
      status: 200,
      json: async () => makeIncidentFixture({ status }),
    });
  });

  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

type MockApiOptions = {
  token?: {
    applicationId: string;
    sessionId: string;
    token: string;
  };
  tokenStatus?: number;
  tokenPending?: boolean;
  tokenNetworkError?: boolean;
};

function mockApi({
  token = {
    applicationId: 'app_demo',
    sessionId: 'sess_demo',
    token: 'token_demo',
  },
  tokenStatus = 200,
  tokenPending = false,
  tokenNetworkError = false,
}: MockApiOptions = {}) {
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    if (String(input) === '/api/video-tokens') {
      if (tokenPending) {
        return new Promise<never>(() => undefined);
      }
      if (tokenNetworkError) {
        return Promise.reject(new Error('offline'));
      }

      return Promise.resolve({
        ok: tokenStatus >= 200 && tokenStatus < 300,
        status: tokenStatus,
        json: async () => (tokenStatus >= 200 && tokenStatus < 300
          ? token
          : { error: 'No se pudo generar el token' }),
      });
    }

    return Promise.resolve({
      ok: true,
      status: 200,
      json: async () => makeIncidentFixture(),
    });
  });

  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.useRealTimers();
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

describe('IncidentDetail · entrada a la videollamada', () => {
  it('pide el token y monta VideoCall con los datos recibidos', async () => {
    const fetchMock = mockApi();
    renderPage();

    fireEvent.click(
      await screen.findByRole('button', { name: /entrar a la videollamada/i }),
    );

    expect(await screen.findByTestId('video-call')).toHaveTextContent(
      'app_demo:sess_demo:token_demo',
    );
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/video-tokens',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'X-User-Id': 'usr_tenant_demo',
          'X-User-Role': 'TENANT',
        }),
        body: JSON.stringify({ incidentId: 'inc_demo' }),
      }),
    );
    expect(
      screen.queryByRole('button', { name: /entrar a la videollamada/i }),
    ).not.toBeInTheDocument();
  });

  it('deshabilita el botón y muestra "Conectando…" mientras espera', async () => {
    mockApi({ tokenPending: true });
    renderPage();

    fireEvent.click(
      await screen.findByRole('button', { name: /entrar a la videollamada/i }),
    );

    expect(
      await screen.findByRole('button', { name: /conectando/i }),
    ).toBeDisabled();
  });

  it('muestra el error de permiso y permite reintentar con 403', async () => {
    mockApi({ tokenStatus: 403 });
    renderPage();

    fireEvent.click(
      await screen.findByRole('button', { name: /entrar a la videollamada/i }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /no tienes permiso para entrar en esta videollamada/i,
    );
    expect(
      screen.getByRole('button', { name: /entrar a la videollamada/i }),
    ).toBeEnabled();
  });

  it('muestra "Incidencia no encontrada" si el token responde 404', async () => {
    mockApi({ tokenStatus: 404 });
    renderPage();

    fireEvent.click(
      await screen.findByRole('button', { name: /entrar a la videollamada/i }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /incidencia no encontrada/i,
    );
    expect(
      screen.getByRole('button', { name: /entrar a la videollamada/i }),
    ).toBeEnabled();
  });

  it('muestra el error de sesión no disponible con 409', async () => {
    mockApi({ tokenStatus: 409 });
    renderPage();

    fireEvent.click(
      await screen.findByRole('button', { name: /entrar a la videollamada/i }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /la videollamada ya no está disponible/i,
    );
  });

  it('muestra un error genérico con 500', async () => {
    mockApi({ tokenStatus: 500 });
    renderPage();

    fireEvent.click(
      await screen.findByRole('button', { name: /entrar a la videollamada/i }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /no se pudo iniciar la videollamada/i,
    );
  });

  it('muestra un error genérico si falla la red', async () => {
    mockApi({ tokenNetworkError: true });
    renderPage();

    fireEvent.click(
      await screen.findByRole('button', { name: /entrar a la videollamada/i }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /no se pudo iniciar la videollamada/i,
    );
  });

  it('usa las cabeceras de la técnica al pedir el token', async () => {
    const fetchMock = mockApi();
    renderPage();

    await screen.findByRole('heading', { name: /fuga de agua/i });
    fireEvent.click(screen.getByRole('radio', { name: /técnica/i }));
    fireEvent.click(
      screen.getByRole('button', { name: /entrar a la videollamada/i }),
    );

    expect(await screen.findByTestId('video-call')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/video-tokens',
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-User-Id': 'usr_technician_demo',
          'X-User-Role': 'TECHNICIAN',
        }),
        body: JSON.stringify({ incidentId: 'inc_demo' }),
      }),
    );
  });

  it('bloquea el selector de rol mientras hay una llamada montada', async () => {
    mockApi();
    renderPage();

    fireEvent.click(
      await screen.findByRole('button', { name: /entrar a la videollamada/i }),
    );

    await screen.findByTestId('video-call');
    expect(screen.getByRole('radio', { name: /inquilina/i })).toBeDisabled();
    expect(screen.getByRole('radio', { name: /técnica/i })).toBeDisabled();
  });
});

describe('IncidentDetail · aviso de fin de visita', () => {
  it('no muestra el toast si la incidencia ya llega VIDEO_COMPLETED', async () => {
    mockIncidentSequence(['VIDEO_COMPLETED']);
    renderPage();

    const button = await screen.findByRole('button', {
      name: /visita realizada/i,
    });

    expect(button).toBeDisabled();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('muestra el toast cuando pasa a VIDEO_COMPLETED y lo oculta a los 5 s', async () => {
    mockIncidentSequence(['VISIT_ASSIGNED']);
    const { queryClient } = renderPageWithClient();

    await screen.findByRole('heading', { name: /fuga de agua/i });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    vi.useFakeTimers();
    await act(async () => {
      queryClient.setQueryData(
        ['incident', 'inc_demo'],
        makeIncidentFixture({ status: 'VIDEO_COMPLETED' }),
      );
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(screen.getByRole('status')).toHaveTextContent(FINISH_TOAST_MESSAGE);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('no duplica el toast con actualizaciones repetidas en VIDEO_COMPLETED', async () => {
    mockIncidentSequence(['VISIT_ASSIGNED']);
    const { queryClient } = renderPageWithClient();

    await screen.findByRole('heading', { name: /fuga de agua/i });

    vi.useFakeTimers();
    await act(async () => {
      const completed = makeIncidentFixture({ status: 'VIDEO_COMPLETED' });
      queryClient.setQueryData(['incident', 'inc_demo'], completed);
      queryClient.setQueryData(['incident', 'inc_demo'], completed);
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(screen.getAllByRole('status')).toHaveLength(1);
  });

  it('vuelve a consultar la incidencia cada 5 s mientras no esté completada', async () => {
    const fetchMock = mockIncidentSequence(['VISIT_ASSIGNED', 'VISIT_ASSIGNED']);

    vi.useFakeTimers();
    renderPage();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

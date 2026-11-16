import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import App, { getIncidentIdFromUrl } from './App.js';
import { makeIncidentFixture } from './test/fixtures/incident.js';

function renderApp() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getIncidentIdFromUrl', () => {
  it('usa inc_demo cuando la URL no trae incidentId', () => {
    expect(getIncidentIdFromUrl('')).toBe('inc_demo');
  });

  it('lee incidentId de la URL', () => {
    expect(getIncidentIdFromUrl('?incidentId=inc_otra')).toBe('inc_otra');
  });
});

describe('App', () => {
  it('renderiza la incidencia por defecto', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => makeIncidentFixture(),
    });
    vi.stubGlobal('fetch', fetchMock);

    renderApp();

    expect(
      await screen.findByRole('heading', { name: /fuga de agua/i }),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/incidents/inc_demo',
      expect.anything(),
    );
  });
});

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import App from './App.js';

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

describe('App', () => {
  it('muestra el título del MVP', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'ok', timestamp: '2026-01-01T00:00:00Z' }),
      }),
    );

    renderApp();

    expect(
      screen.getByRole('heading', { name: /homefix connect/i }),
    ).toBeInTheDocument();
  });

  it('muestra el estado del backend cuando la API responde', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'ok', timestamp: '2026-01-01T00:00:00Z' }),
      }),
    );

    renderApp();

    expect(await screen.findByText(/backend: ok/i)).toBeInTheDocument();
  });

  it('muestra error cuando la API no responde', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    renderApp();

    expect(
      await screen.findByText(/sin conexión con la api/i),
    ).toBeInTheDocument();
  });
});

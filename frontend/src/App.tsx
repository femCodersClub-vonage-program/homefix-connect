import { useQuery } from '@tanstack/react-query';

import { getJson } from './api/http.js';

type HealthResponse = {
  status: string;
  timestamp: string;
};

export default function App() {
  const health = useQuery({
    queryKey: ['health'],
    queryFn: () => getJson<HealthResponse>('/api/health'),
  });

  return (
    <main className="app">
      <h1>Homefix Connect</h1>
      <p className="subtitle">
        MVP: videollamada 1-a-1 con Vonage Video y SMS post-visita.
      </p>

      <section className="card">
        <h2>Backend</h2>
        {health.isPending && <p>Comprobando…</p>}
        {health.isError && <p className="error">Sin conexión con la API</p>}
        {health.data && (
          <p className="ok">
            Backend: {health.data.status}{' '}
            <span className="muted">({health.data.timestamp})</span>
          </p>
        )}
      </section>

      <footer className="footer">
        <span>Monorepo pnpm · backend y frontend separados</span>
        <span>Docs: docs/MVP_DEFINITION.md · docs/TASKS.md</span>
      </footer>
    </main>
  );
}

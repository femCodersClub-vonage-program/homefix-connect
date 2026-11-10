const baseUrl = import.meta.env.VITE_API_BASE_URL ?? '';

/**
 * Cliente HTTP provisional.
 * El cliente definitivo se genera desde `backend/openapi.yaml` en C1.
 */
export async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`GET ${path} respondió ${response.status}`);
  }

  return (await response.json()) as T;
}

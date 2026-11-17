const baseUrl = import.meta.env.VITE_API_BASE_URL ?? '';

export class HttpError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

export type GetJsonOptions = {
  headers?: Record<string, string>;
};

/**
 * Cliente HTTP provisional.
 * El cliente definitivo se genera desde `backend/openapi.yaml` en C1.
 */
export async function getJson<T>(
  path: string,
  options: GetJsonOptions = {},
): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { Accept: 'application/json', ...options.headers },
  });

  if (!response.ok) {
    throw new HttpError(
      `GET ${path} respondió ${response.status}`,
      response.status,
    );
  }

  return (await response.json()) as T;
}

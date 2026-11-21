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

export type PostJsonOptions = {
  headers?: Record<string, string>;
};

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

export async function postJson<TResponse, TBody>(
  path: string,
  body: TBody,
  options: PostJsonOptions = {},
): Promise<TResponse> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new HttpError(
      `POST ${path} respondió ${response.status}`,
      response.status,
    );
  }

  return (await response.json()) as TResponse;
}

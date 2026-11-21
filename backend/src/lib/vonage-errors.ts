// B1 · Errores tipados de Vonage Messages (Q4).
// Viven aparte del cliente para que B2/B3 los importen sin depender de él.

export class VonageAuthError extends Error {
  override readonly name = 'VonageAuthError';
}

export class VonageValidationError extends Error {
  override readonly name = 'VonageValidationError';
}

export class VonageNetworkError extends Error {
  override readonly name = 'VonageNetworkError';
}

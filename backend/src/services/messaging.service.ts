export interface MessagingService {
  sendSms(to: string, body: string): Promise<{ providerMessageId: string }>;
}

/**
 * Stub en memoria: no envía SMS reales. La implementación con Vonage llega
 * en B1/B2 y debe cumplir esta misma interface.
 */
export class InMemoryMessagingService implements MessagingService {
  private counter = 0;

  async sendSms(
    _to: string,
    _body: string,
  ): Promise<{ providerMessageId: string }> {
    this.counter += 1;
    return { providerMessageId: `stub-msg-${this.counter}` };
  }
}

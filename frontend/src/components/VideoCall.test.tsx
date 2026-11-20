import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { VideoCall } from './VideoCall.js';

const sdk = vi.hoisted(() => ({
  initSession: vi.fn(),
  initPublisher: vi.fn(),
}));

vi.mock('@vonage/client-sdk-video', () => ({
  default: sdk,
}));

type Callback = (error?: unknown) => void;

type MockSession = {
  connect: ReturnType<typeof vi.fn>;
  publish: ReturnType<typeof vi.fn>;
  unpublish: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
};

type MockPublisher = {
  destroy: ReturnType<typeof vi.fn>;
};

let session: MockSession;
let publisher: MockPublisher;
let handlers: Map<string, () => void>;

beforeEach(() => {
  vi.clearAllMocks();
  handlers = new Map();

  session = {
    connect: vi.fn(),
    publish: vi.fn(),
    unpublish: vi.fn(),
    disconnect: vi.fn().mockResolvedValue(undefined),
    on: vi.fn((event: string, handler: () => void) => {
      handlers.set(event, handler);
      return session;
    }),
    off: vi.fn(() => session),
  };
  publisher = { destroy: vi.fn() };

  sdk.initSession.mockReturnValue(session);
  sdk.initPublisher.mockImplementation(
    (_target: unknown, _properties: unknown, callback?: Callback) => {
      callback?.();
      return publisher;
    },
  );
  session.connect.mockImplementation((_token: string, callback: Callback) => {
    callback();
    return session;
  });
  session.publish.mockImplementation(
    (_publisher: unknown, callback?: Callback) => {
      callback?.();
      return publisher;
    },
  );
});

function renderCall() {
  return render(
    <VideoCall
      applicationId="app_demo"
      sessionId="sess_demo"
      token="token_demo"
    />,
  );
}

describe('VideoCall', () => {
  it('inicializa la sesión, conecta y publica audio y vídeo', async () => {
    renderCall();

    expect(await screen.findByText('Conectada')).toBeInTheDocument();
    expect(sdk.initSession).toHaveBeenCalledWith('app_demo', 'sess_demo');
    expect(session.connect).toHaveBeenCalledWith(
      'token_demo',
      expect.any(Function),
    );
    expect(sdk.initPublisher).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      {
        insertMode: 'append',
        width: '100%',
        height: '100%',
        publishAudio: true,
        publishVideo: true,
      },
      expect.any(Function),
    );
    expect(session.publish).toHaveBeenCalledWith(
      publisher,
      expect.any(Function),
    );
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });

  it('muestra "Conectando…" antes de que termine la conexión', () => {
    let connectCallback: Callback | undefined;
    session.connect.mockImplementation((_token: string, callback: Callback) => {
      connectCallback = callback;
      return session;
    });

    renderCall();

    expect(screen.getByText('Conectando…')).toBeInTheDocument();

    act(() => {
      connectCallback?.();
    });

    expect(screen.getByText('Conectada')).toBeInTheDocument();
  });

  it.each(['sessionDisconnected', 'connectionDestroyed'])(
    'pasa a "Videollamada finalizada" con %s y limpia los recursos',
    async (eventName) => {
      renderCall();
      await screen.findByText('Conectada');

      act(() => {
        handlers.get(eventName)?.();
      });

      expect(screen.getByText('Videollamada finalizada')).toBeInTheDocument();
      expect(session.unpublish).toHaveBeenCalledWith(publisher);
      expect(publisher.destroy).toHaveBeenCalled();
      expect(session.disconnect).toHaveBeenCalled();
    },
  );

  it('hace cleanup completo al desmontar', async () => {
    const { unmount } = renderCall();
    await screen.findByText('Conectada');

    unmount();

    expect(session.off).toHaveBeenCalledWith(
      'sessionDisconnected',
      expect.any(Function),
    );
    expect(session.off).toHaveBeenCalledWith(
      'connectionDestroyed',
      expect.any(Function),
    );
    expect(session.unpublish).toHaveBeenCalledWith(publisher);
    expect(publisher.destroy).toHaveBeenCalled();
    expect(session.disconnect).toHaveBeenCalled();
  });

  it('muestra error si connect falla y limpia la sesión', async () => {
    session.connect.mockImplementation((_token: string, callback: Callback) => {
      callback({ message: 'connect failed' });
      return session;
    });

    renderCall();

    expect(
      await screen.findByText('No se pudo iniciar la videollamada'),
    ).toBeInTheDocument();
    expect(session.disconnect).toHaveBeenCalled();
  });

  it('muestra error si initPublisher falla', async () => {
    sdk.initPublisher.mockImplementation(
      (_target: unknown, _properties: unknown, callback?: Callback) => {
        callback?.({ message: 'permission denied' });
        return publisher;
      },
    );

    renderCall();

    expect(
      await screen.findByText('No se pudo iniciar la videollamada'),
    ).toBeInTheDocument();
    expect(session.disconnect).toHaveBeenCalled();
  });

  it('muestra error si publish falla', async () => {
    session.publish.mockImplementation(
      (_publisher: unknown, callback?: Callback) => {
        callback?.({ message: 'publish failed' });
        return publisher;
      },
    );

    renderCall();

    expect(
      await screen.findByText('No se pudo iniciar la videollamada'),
    ).toBeInTheDocument();
    expect(session.disconnect).toHaveBeenCalled();
  });
});

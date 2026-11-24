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
type StreamEvent = {
  stream: {
    streamId: string;
    connection: { connectionId: string };
  };
};
type EventHandler = (event?: StreamEvent) => void;

type MockSession = {
  connection: { connectionId: string };
  connect: ReturnType<typeof vi.fn>;
  publish: ReturnType<typeof vi.fn>;
  unpublish: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
  unsubscribe: ReturnType<typeof vi.fn>;
};

type MockPublisher = {
  destroy: ReturnType<typeof vi.fn>;
};

type MockSubscriber = {
  stream: { streamId: string };
};

let session: MockSession;
let publisher: MockPublisher;
let subscriber: MockSubscriber;
let handlers: Map<string, EventHandler[]>;

function remoteStream(
  streamId = 'stream_remote',
  connectionId = 'conn_remote',
): StreamEvent['stream'] {
  return { streamId, connection: { connectionId } };
}

function emit(eventName: string, event?: StreamEvent) {
  act(() => {
    handlers.get(eventName)?.forEach((handler) => handler(event));
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  handlers = new Map();

  session = {
    connection: { connectionId: 'conn_local' },
    connect: vi.fn(),
    publish: vi.fn(),
    unpublish: vi.fn(),
    disconnect: vi.fn().mockResolvedValue(undefined),
    on: vi.fn((event: string, handler: EventHandler) => {
      handlers.set(event, [...(handlers.get(event) ?? []), handler]);
      return session;
    }),
    off: vi.fn(() => session),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  };
  publisher = { destroy: vi.fn() };
  subscriber = { stream: { streamId: 'stream_remote' } };

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
  session.subscribe.mockImplementation(
    (
      _stream: unknown,
      _target: unknown,
      _properties: unknown,
      callback?: Callback,
    ) => {
      callback?.();
      return subscriber;
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

  it('suscribe el stream remoto en el contenedor remoto', async () => {
    renderCall();
    await screen.findByText('Conectada');

    const stream = remoteStream();
    emit('streamCreated', { stream });

    expect(session.subscribe).toHaveBeenCalledWith(
      stream,
      screen.getByLabelText('Vídeo remoto'),
      {
        insertMode: 'append',
        width: '100%',
        height: '100%',
        subscribeToAudio: true,
        subscribeToVideo: true,
      },
      expect.any(Function),
    );
    expect(
      screen.queryByText('Esperando a la otra persona…'),
    ).not.toBeInTheDocument();
  });

  it('muestra el placeholder mientras no hay stream remoto', async () => {
    renderCall();
    await screen.findByText('Conectada');

    expect(
      screen.getByText('Esperando a la otra persona…'),
    ).toBeInTheDocument();
  });

  it('no suscribe el stream publicado por esta sesión', async () => {
    renderCall();
    await screen.findByText('Conectada');

    emit('streamCreated', {
      stream: remoteStream('stream_local', 'conn_local'),
    });

    expect(session.subscribe).not.toHaveBeenCalled();
  });

  it('solo suscribe un stream remoto en la llamada 1-a-1', async () => {
    renderCall();
    await screen.findByText('Conectada');

    emit('streamCreated', { stream: remoteStream('stream_1') });
    emit('streamCreated', { stream: remoteStream('stream_2') });

    expect(session.subscribe).toHaveBeenCalledTimes(1);
  });

  it('desuscribe el stream remoto y pasa a "Desconectada"', async () => {
    renderCall();
    await screen.findByText('Conectada');

    emit('streamCreated', { stream: remoteStream() });
    emit('streamDestroyed', { stream: remoteStream() });

    expect(session.unsubscribe).toHaveBeenCalledWith(subscriber);
    expect(screen.getByText('Desconectada')).toBeInTheDocument();
  });

  it('ignora un "streamDestroyed" de otro stream', async () => {
    renderCall();
    await screen.findByText('Conectada');

    emit('streamCreated', { stream: remoteStream() });
    emit('streamDestroyed', { stream: remoteStream('stream_otro') });

    expect(session.unsubscribe).not.toHaveBeenCalled();
    expect(screen.getByText('Conectada')).toBeInTheDocument();
  });

  it.each(['sessionDisconnected', 'connectionDestroyed'])(
    'pasa a "Desconectada" con %s y limpia los recursos',
    async (eventName) => {
      renderCall();
      await screen.findByText('Conectada');

      emit(eventName);

      expect(screen.getByText('Desconectada')).toBeInTheDocument();
      expect(session.unpublish).toHaveBeenCalledWith(publisher);
      expect(publisher.destroy).toHaveBeenCalled();
      expect(session.disconnect).toHaveBeenCalled();
    },
  );

  it('muestra error si la suscripción falla y limpia los recursos', async () => {
    session.subscribe.mockImplementation(
      (
        _stream: unknown,
        _target: unknown,
        _properties: unknown,
        callback?: Callback,
      ) => {
        callback?.({ message: 'subscribe failed' });
        return subscriber;
      },
    );

    renderCall();
    await screen.findByText('Conectada');

    emit('streamCreated', { stream: remoteStream() });

    expect(
      await screen.findByText('No se pudo iniciar la videollamada'),
    ).toBeInTheDocument();
    expect(session.unsubscribe).toHaveBeenCalledWith(subscriber);
    expect(session.disconnect).toHaveBeenCalled();
  });

  it('hace cleanup completo al desmontar', async () => {
    const { unmount } = renderCall();
    await screen.findByText('Conectada');
    emit('streamCreated', { stream: remoteStream() });

    unmount();

    expect(session.off).toHaveBeenCalledWith(
      'sessionDisconnected',
      expect.any(Function),
    );
    expect(session.off).toHaveBeenCalledWith(
      'connectionDestroyed',
      expect.any(Function),
    );
    expect(session.off).toHaveBeenCalledWith(
      'streamCreated',
      expect.any(Function),
    );
    expect(session.off).toHaveBeenCalledWith(
      'streamDestroyed',
      expect.any(Function),
    );
    expect(session.unsubscribe).toHaveBeenCalledWith(subscriber);
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

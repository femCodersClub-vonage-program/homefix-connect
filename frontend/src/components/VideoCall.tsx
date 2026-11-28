import { useRef } from 'react';

import {
  useVideoCall,
  type VideoCallStatus,
} from '../hooks/useVideoCall.js';

type VideoCallProps = {
  applicationId: string;
  sessionId: string;
  token: string;
};

const statusLabels: Record<VideoCallStatus, string> = {
  idle: 'Preparando videollamada…',
  connecting: 'Conectando…',
  connected: 'Conectada',
  error: 'No se pudo iniciar la videollamada',
  ended: 'Desconectada',
};

export function VideoCall({
  applicationId,
  sessionId,
  token,
}: VideoCallProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const remoteContainerRef = useRef<HTMLDivElement>(null);
  const { status, remoteConnected, hangup, switchCamera } = useVideoCall({
    applicationId,
    sessionId,
    token,
    containerRef,
    remoteContainerRef,
  });

  return (
    <section className="video-call" aria-labelledby="video-call-title">
      <h2 id="video-call-title">Videollamada</h2>
      <p
        className={`video-call__status video-call__status--${status}`}
        role="status"
        aria-live="polite"
      >
        {statusLabels[status]}
      </p>
      <button
        type="button"
        className="video-call__camera"
        aria-label="Alternar cámara"
        disabled={status !== 'connected'}
        onClick={switchCamera}
      >
        Alternar cámara
      </button>
      <button
        type="button"
        className="video-call__hangup"
        disabled={status !== 'connected'}
        onClick={hangup}
      >
        Colgar
      </button>
      <div className="video-call__stage">
        <div className="video-call__remote-wrap">
          <div
            ref={remoteContainerRef}
            className="video-call__remote"
            aria-label="Vídeo remoto"
          />
          {status === 'connected' && !remoteConnected ? (
            <p className="video-call__waiting">
              Esperando a la otra persona…
            </p>
          ) : null}
        </div>
        <div
          ref={containerRef}
          className="video-call__local"
          aria-label="Vídeo local"
        />
      </div>
    </section>
  );
}

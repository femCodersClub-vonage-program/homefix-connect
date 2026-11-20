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
  ended: 'Videollamada finalizada',
};

export function VideoCall({
  applicationId,
  sessionId,
  token,
}: VideoCallProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const status = useVideoCall({
    applicationId,
    sessionId,
    token,
    containerRef,
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
      <div className="video-call__stage">
        <div
          ref={containerRef}
          className="video-call__local"
          aria-label="Vídeo local"
        />
      </div>
    </section>
  );
}

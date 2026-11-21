import { useEffect, useState, type RefObject } from 'react';
import OT from '@vonage/client-sdk-video';

export type VideoCallStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'error'
  | 'ended';

type UseVideoCallParams = {
  applicationId: string;
  sessionId: string;
  token: string;
  containerRef: RefObject<HTMLDivElement | null>;
};

const publisherOptions = {
  insertMode: 'append',
  width: '100%',
  height: '100%',
  publishAudio: true,
  publishVideo: true,
} as const;

export function useVideoCall({
  applicationId,
  sessionId,
  token,
  containerRef,
}: UseVideoCallParams): VideoCallStatus {
  const [status, setStatus] = useState<VideoCallStatus>('idle');

  useEffect(() => {
    const target = containerRef.current;

    if (!target) {
      setStatus('error');
      return;
    }

    let disposed = false;
    let cleaned = false;
    let publishStarted = false;
    let session: OT.Session | null = null;
    let publisher: OT.Publisher | null = null;

    function cleanup() {
      if (cleaned) return;
      cleaned = true;

      const activeSession = session;
      const activePublisher = publisher;
      session = null;
      publisher = null;

      if (activeSession) {
        try {
          activeSession.off('sessionDisconnected', handleDisconnected);
          activeSession.off('connectionDestroyed', handleConnectionDestroyed);
        } catch {
          // La sesión puede haberse cerrado ya por una desconexión.
        }
      }

      if (activePublisher) {
        if (activeSession) {
          try {
            activeSession.unpublish(activePublisher);
          } catch {
            // El SDK puede haber cerrado ya la sesión.
          }
        }
        try {
          activePublisher.destroy();
        } catch {
          // El publisher puede haberse destruido ya por una desconexión.
        }
      }

      if (activeSession) {
        try {
          void activeSession.disconnect().catch(() => undefined);
        } catch {
          // El SDK puede haber cerrado ya la sesión.
        }
      }
    }

    function fail() {
      if (disposed || cleaned) return;
      setStatus('error');
      cleanup();
    }

    function handleDisconnected() {
      if (disposed || cleaned) return;
      setStatus('ended');
      cleanup();
    }

    function handleConnectionDestroyed() {
      if (disposed || cleaned) return;
      setStatus('ended');
      cleanup();
    }

    function publishLocal(currentPublisher: OT.Publisher) {
      if (disposed || cleaned || publishStarted || !session) return;
      publishStarted = true;
      publisher = currentPublisher;

      try {
        session.publish(currentPublisher, (error) => {
          if (disposed || cleaned) return;
          if (error) {
            fail();
            return;
          }
          setStatus('connected');
        });
      } catch {
        fail();
      }
    }

    function startPublisher(
      activeSession: OT.Session,
      targetElement: HTMLDivElement,
    ) {
      let publisherFromReturn: OT.Publisher | null = null;
      let callbackRan = false;
      let callbackError: unknown = null;

      function onPublisherReady(error?: unknown) {
        callbackRan = true;
        callbackError = error;

        if (error) {
          fail();
          return;
        }
        if (disposed || cleaned) {
          if (publisherFromReturn && publisher === publisherFromReturn) {
            publisher = null;
            publisherFromReturn.destroy();
          }
          return;
        }

        if (publisherFromReturn) {
          publishLocal(publisherFromReturn);
        }
      }

      try {
        publisherFromReturn = OT.initPublisher(
          targetElement,
          publisherOptions,
          onPublisherReady,
        );
        publisher = publisherFromReturn;

        if (disposed || cleaned) {
          publisher = null;
          publisherFromReturn.destroy();
          return;
        }

        // El SDK puede invocar el callback antes de devolver el publisher.
        if (callbackRan) {
          if (callbackError) {
            fail();
          } else if (publisherFromReturn) {
            publishLocal(publisherFromReturn);
          }
        }
      } catch {
        fail();
      }
    }

    try {
      session = OT.initSession(applicationId, sessionId);
      session.on('sessionDisconnected', handleDisconnected);
      session.on('connectionDestroyed', handleConnectionDestroyed);
      setStatus('connecting');

      const activeSession = session;
      activeSession.connect(token, (error) => {
        if (disposed || cleaned) return;
        if (error) {
          fail();
          return;
        }
        startPublisher(activeSession, target);
      });
    } catch {
      fail();
    }

    return () => {
      disposed = true;
      cleanup();
    };
  }, [applicationId, sessionId, token, containerRef]);

  return status;
}

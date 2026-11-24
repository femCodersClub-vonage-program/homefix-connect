import { useEffect, useState, type RefObject } from 'react';
import OT from '@vonage/client-sdk-video';

export type VideoCallStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'error'
  | 'ended';

export type VideoCallState = {
  status: VideoCallStatus;
  remoteConnected: boolean;
};

type UseVideoCallParams = {
  applicationId: string;
  sessionId: string;
  token: string;
  containerRef: RefObject<HTMLDivElement | null>;
  remoteContainerRef: RefObject<HTMLDivElement | null>;
};

const publisherOptions = {
  insertMode: 'append',
  width: '100%',
  height: '100%',
  publishAudio: true,
  publishVideo: true,
} as const;

const subscriberOptions = {
  insertMode: 'append',
  width: '100%',
  height: '100%',
  subscribeToAudio: true,
  subscribeToVideo: true,
} as const;

type StreamEvent = { stream: OT.Stream };

export function useVideoCall({
  applicationId,
  sessionId,
  token,
  containerRef,
  remoteContainerRef,
}: UseVideoCallParams): VideoCallState {
  const [status, setStatus] = useState<VideoCallStatus>('idle');
  const [remoteConnected, setRemoteConnected] = useState(false);

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
    let subscriber: OT.Subscriber | null = null;
    let remoteStreamId: string | null = null;

    function unsubscribeRemote() {
      const activeSession = session;
      const activeSubscriber = subscriber;
      subscriber = null;
      remoteStreamId = null;

      if (!activeSubscriber) return;

      try {
        activeSession?.unsubscribe(activeSubscriber);
      } catch {
        void 0;
      }
    }

    function cleanup() {
      if (cleaned) return;
      cleaned = true;

      const activeSession = session;
      const activePublisher = publisher;

      if (activeSession) {
        try {
          activeSession.off('sessionDisconnected', handleDisconnected);
          activeSession.off('connectionDestroyed', handleConnectionDestroyed);
          activeSession.off('streamCreated', handleStreamCreated);
          activeSession.off('streamDestroyed', handleStreamDestroyed);
        } catch {
          void 0;
        }
      }

      unsubscribeRemote();

      session = null;
      publisher = null;

      if (activePublisher) {
        if (activeSession) {
          try {
            activeSession.unpublish(activePublisher);
          } catch {
            void 0;
          }
        }
        try {
          activePublisher.destroy();
        } catch {
          void 0;
        }
      }

      if (activeSession) {
        try {
          void activeSession.disconnect().catch(() => undefined);
        } catch {
          void 0;
        }
      }
    }

    function fail() {
      if (disposed || cleaned) return;
      setStatus('error');
      setRemoteConnected(false);
      cleanup();
    }

    function handleDisconnected() {
      if (disposed || cleaned) return;
      setStatus('ended');
      setRemoteConnected(false);
      cleanup();
    }

    function handleConnectionDestroyed() {
      if (disposed || cleaned) return;
      setStatus('ended');
      setRemoteConnected(false);
      cleanup();
    }

    function handleRemoteGone() {
      if (disposed || cleaned) return;
      setStatus('ended');
      setRemoteConnected(false);
      cleanup();
    }

    function handleStreamCreated(event: StreamEvent) {
      if (disposed || cleaned || subscriber || remoteStreamId) return;

      const activeSession = session;
      if (!activeSession) return;

      if (
        activeSession.connection &&
        event.stream.connection.connectionId ===
          activeSession.connection.connectionId
      ) {
        return;
      }

      const remoteTarget = remoteContainerRef.current;
      if (!remoteTarget) {
        fail();
        return;
      }

      remoteStreamId = event.stream.streamId;

      try {
        const created = activeSession.subscribe(
          event.stream,
          remoteTarget,
          subscriberOptions,
          (error) => {
            if (error) fail();
          },
        );
        subscriber = created;

        if (disposed || cleaned) {
          subscriber = null;
          try {
            activeSession.unsubscribe(created);
          } catch {
            void 0;
          }
          return;
        }

        setRemoteConnected(true);
      } catch {
        fail();
      }
    }

    function handleStreamDestroyed(event: StreamEvent) {
      if (disposed || cleaned) return;
      if (!remoteStreamId || event.stream.streamId !== remoteStreamId) return;
      handleRemoteGone();
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
      session.on('streamCreated', handleStreamCreated);
      session.on('streamDestroyed', handleStreamDestroyed);
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
  }, [applicationId, sessionId, token, containerRef, remoteContainerRef]);

  return { status, remoteConnected };
}

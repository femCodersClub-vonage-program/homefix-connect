import { useEffect, useRef, useState } from 'react';

import type { IncidentStatus } from '../api/incidents.js';

const FINISH_TOAST_DURATION_MS = 5_000;

export function useFinishToast(status: IncidentStatus | undefined): boolean {
  const [visible, setVisible] = useState(false);
  const previousStatus = useRef<IncidentStatus | undefined>(undefined);

  useEffect(() => {
    const previous = previousStatus.current;
    previousStatus.current = status;

    if (status !== 'VIDEO_COMPLETED') {
      setVisible(false);
      return;
    }

    if (previous === undefined || previous === 'VIDEO_COMPLETED') {
      return;
    }

    setVisible(true);

    const timer = window.setTimeout(
      () => setVisible(false),
      FINISH_TOAST_DURATION_MS,
    );

    return () => window.clearTimeout(timer);
  }, [status]);

  return visible;
}

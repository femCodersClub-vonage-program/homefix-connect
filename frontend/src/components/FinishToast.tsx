export const FINISH_TOAST_MESSAGE =
  'Visita finalizada. Notificaciones enviadas a gestora e inquilina.';

export function FinishToast({ open }: { open: boolean }) {
  if (!open) {
    return null;
  }

  return (
    <p className="toast" role="status" aria-live="polite">
      {FINISH_TOAST_MESSAGE}
    </p>
  );
}

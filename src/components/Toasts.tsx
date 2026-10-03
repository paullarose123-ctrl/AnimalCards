import { useEffect } from 'react';
import { useGame, type Toast } from '../store/game';
import { sfx } from '../audio/sfx';

function ToastItem({ toast }: { toast: Toast }) {
  const dismiss = useGame((s) => s.dismissToast);
  useEffect(() => {
    if (toast.kind === 'gold' || toast.kind === 'success') sfx.coin();
    if (toast.kind === 'error') sfx.error();
    const id = window.setTimeout(() => dismiss(toast.id), toast.kind === 'error' ? 4200 : 5200);
    return () => window.clearTimeout(id);
  }, [toast, dismiss]);
  return (
    <div className={`toast toast--${toast.kind}`} role={toast.kind === 'error' ? 'alert' : 'status'}>
      <span>{toast.text}</span>
      <button type="button" onClick={() => dismiss(toast.id)} aria-label="Fermer la notification">
        ×
      </button>
    </div>
  );
}

export function Toasts() {
  const toasts = useGame((s) => s.toasts);
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}

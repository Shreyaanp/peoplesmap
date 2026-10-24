import { useEffect } from 'react';
import { useToast, useToastActions } from '../state/toast';
import styles from './Toaster.module.css';

/** How long a toast (and its Undo) stays up. */
const toastLife = 6_000;

/**
 * Draws the toast. The status region is always there, so screen readers announce each new toast
 * as it appears.
 */
export function Toaster() {
  const toast = useToast();
  const { dismiss } = useToastActions();

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => dismiss(toast.id), toastLife);
    return () => clearTimeout(timer);
  }, [toast, dismiss]);

  return (
    <div className={styles.region} role="status">
      {toast && (
        <div key={toast.id} className={styles.toast}>
          <span>{toast.text}</span>
          {toast.action && (
            <button
              type="button"
              className={styles.action}
              onClick={() => {
                toast.action?.run();
                dismiss(toast.id);
              }}
            >
              {toast.action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

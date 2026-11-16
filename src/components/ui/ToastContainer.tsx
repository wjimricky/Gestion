import React from 'react';
import { useFinancial } from '../../context/FinancialContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useFinancial();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-label="Notifications"
      className="fixed bottom-20 sm:bottom-5 right-4 left-4 sm:left-auto sm:w-96 z-50 flex flex-col gap-2 pointer-events-none no-print"
    >
      {toasts.map((toast) => {
        const styles =
          toast.type === 'success'
            ? 'bg-white dark:bg-zinc-900 border-emerald-600/40 text-zinc-900 dark:text-zinc-100'
            : toast.type === 'error'
            ? 'bg-white dark:bg-zinc-900 border-red-600/50 text-zinc-900 dark:text-zinc-100'
            : 'bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100';

        const Icon =
          toast.type === 'success'
            ? CheckCircle2
            : toast.type === 'error'
            ? AlertCircle
            : Info;

        const iconColor =
          toast.type === 'success'
            ? 'text-emerald-700 dark:text-emerald-400'
            : toast.type === 'error'
            ? 'text-red-700 dark:text-red-400'
            : 'text-zinc-600 dark:text-zinc-400';

        return (
          <div
            key={toast.id}
            role="status"
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg ${styles}`}
          >
            <Icon className={`w-5 h-5 shrink-0 ${iconColor}`} />
            <span className="text-xs sm:text-sm font-medium flex-1 leading-snug">
              {toast.message}
            </span>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="Fermer la notification"
              className="min-h-10 min-w-10 -mr-2 inline-flex items-center justify-center rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

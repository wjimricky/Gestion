import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class FirestoreErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    let readable = error?.message || 'Une erreur inattendue est survenue.';
    try {
      const parsed = JSON.parse(readable) as { error?: string; operationType?: string; path?: string };
      if (parsed && parsed.error) {
        readable = `Synchronisation Cloud (${parsed.operationType || 'opération'} sur ${parsed.path || 'ressource'}) : ${parsed.error}`;
      }
    } catch {
      // Keep original message
    }
    return { hasError: true, errorMessage: readable };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#090912] p-6">
          <div className="max-w-lg w-full p-6 rounded-xl border border-rose-500/45 bg-white dark:bg-[#11101C] space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div>
                <h1 className="text-sm font-bold text-zinc-900 dark:text-white">
                  Erreur de synchronisation ou de rendu
                </h1>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 break-words">
                  {this.state.errorMessage}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, errorMessage: '' });
                window.location.reload();
              }}
              className="min-h-10 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center gap-2 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Recharger l’espace de travail</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

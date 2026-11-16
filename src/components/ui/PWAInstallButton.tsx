import React, { useState } from 'react';
import { Download, Share, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Modal } from './Modal';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        title="Installer l'application pour un accès hors-ligne sur le terrain"
        aria-label="Installer l'application"
        className={`min-h-11 sm:min-h-10 px-2.5 sm:px-3 text-xs font-semibold rounded-xl border border-teal-500/40 bg-teal-500/10 text-teal-800 dark:text-teal-300 hover:bg-teal-500/20 transition-colors inline-flex items-center gap-1.5 ${
          compact ? 'w-full justify-center' : ''
        }`}
      >
        <Download className="w-4 h-4 shrink-0" aria-hidden="true" />
        <span className={compact ? 'inline' : 'hidden xl:inline'}>Installer</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          title="Installer sur iPhone ou iPad (accès hors-ligne)"
          aria-label="Installer sur iOS"
          className={`min-h-11 sm:min-h-10 px-2.5 sm:px-3 text-xs font-semibold rounded-xl border border-teal-500/40 bg-teal-500/10 text-teal-800 dark:text-teal-300 hover:bg-teal-500/20 transition-colors inline-flex items-center gap-1.5 ${
            compact ? 'w-full justify-center' : ''
          }`}
        >
          <Smartphone className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span className={compact ? 'inline' : 'hidden xl:inline'}>Installer iOS</span>
        </button>

        <Modal
          open={showIOSGuide}
          onClose={() => setShowIOSGuide(false)}
          title="Installer RizMada sur iPhone / iPad"
          description="Utilisez l'application en plein écran et hors-ligne lors de vos déplacements."
          maxWidthClass="max-w-sm"
        >
          <div className="space-y-4 text-sm text-zinc-700 dark:text-zinc-300">
            <ol className="space-y-3 list-decimal list-inside">
              <li>
                Appuyez sur le bouton{' '}
                <span className="inline-flex items-center gap-1 font-semibold text-zinc-900 dark:text-white">
                  <Share className="w-3.5 h-3.5 text-indigo-500" aria-hidden="true" />
                  Partager
                </span>{' '}
                dans la barre Safari.
              </li>
              <li>
                Faites défiler vers le bas puis sélectionnez{' '}
                <strong className="text-zinc-900 dark:text-white">
                  Sur l’écran d’accueil
                </strong>
                .
              </li>
              <li>
                Confirmez en appuyant sur{' '}
                <strong className="text-zinc-900 dark:text-white">Ajouter</strong>.
              </li>
            </ol>
            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="w-full min-h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors"
            >
              Compris
            </button>
          </div>
        </Modal>
      </>
    );
  }

  return null;
};

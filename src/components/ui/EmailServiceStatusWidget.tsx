import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Loader2,
  Mail,
  Settings,
  ShieldAlert,
  WifiOff,
} from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import {
  getCurrentGoogleUser,
  getInMemoryGoogleAccessToken,
  signInWithGoogleForSheets,
  subscribeGoogleAuthUser,
} from '../../services/googleSheetsAuth';
import {
  getDispatchKindLabel,
  parseRecipientEmails,
} from '../../services/gmailAlerts';

interface EmailServiceStatusWidgetProps {
  onNavigate: (tabId: string) => void;
  onOpenEmailModal: () => void;
}

export const EmailServiceStatusWidget: React.FC<EmailServiceStatusWidgetProps> = ({
  onNavigate,
  onOpenEmailModal,
}) => {
  const {
    emailAlertConfig,
    emailAlertHistory,
    exportEmailAlertHistoryCsv,
    notify,
  } = useFinancial();

  const [user, setUser] = useState<User | null>(() => getCurrentGoogleUser());
  const [hasToken, setHasToken] = useState<boolean>(() =>
    Boolean(getInMemoryGoogleAccessToken())
  );
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    const syncAuth = (nextUser: User | null) => {
      setUser(nextUser);
      setHasToken(Boolean(getInMemoryGoogleAccessToken()));
    };
    const unsub = subscribeGoogleAuthUser(syncAuth);
    const onFocus = () => setHasToken(Boolean(getInMemoryGoogleAccessToken()));
    window.addEventListener('focus', onFocus);
    return () => {
      unsub();
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const handleQuickConnect = async () => {
    setConnecting(true);
    try {
      const res = await signInWithGoogleForSheets();
      setUser(res.user);
      setHasToken(Boolean(res.accessToken));
      notify(
        'success',
        `Service Gmail connecté (${res.user.email || 'compte vérifié'}).`
      );
    } catch (err) {
      notify(
        'error',
        err instanceof Error
          ? err.message
          : 'Impossible de connecter le service Gmail.'
      );
    } finally {
      setConnecting(false);
    }
  };

  const recipients = parseRecipientEmails(emailAlertConfig.recipients);
  const isConnected = Boolean(user && hasToken);
  const isTokenExpired = Boolean(user && !hasToken);

  const sentCount = emailAlertHistory.filter((e) => e.status === 'sent').length;
  const failedCount = emailAlertHistory.filter((e) => e.status === 'failed').length;

  return (
    <section
      aria-label="Statut du service e-mail et journal des alertes envoyées"
      className="animate-dashboard-card rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] overflow-hidden no-print"
    >
      {/* Top Status Strip */}
      <div className="px-4 sm:px-5 py-3.5 border-b border-zinc-200 dark:border-white/[0.08] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="inline-flex items-center gap-1.5 text-sm font-bold text-zinc-900 dark:text-zinc-100">
              <Mail
                className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0"
                aria-hidden="true"
              />
              <span>Service E-mail (API Gmail) &amp; Journal des Alertes</span>
            </span>
            <span className="text-zinc-400 dark:text-zinc-600" aria-hidden="true">
              ·
            </span>
            {isConnected ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Connecté ({user?.email || 'Compte Google'})</span>
              </span>
            ) : isTokenExpired ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Jeton expiré ({user?.email || 'Reconnexion requise'})</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                <WifiOff className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Non connecté</span>
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
            <span>
              Surveillance :{' '}
              <strong
                className={
                  emailAlertConfig.enabled
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-zinc-700 dark:text-zinc-300'
                }
              >
                {emailAlertConfig.enabled ? 'Active' : 'En pause'}
              </strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Destinataires enregistrés :{' '}
              <strong className="font-mono tabular-nums text-zinc-800 dark:text-zinc-200">
                {recipients.length}
              </strong>
              {recipients.length > 0 && (
                <span className="ml-1 font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                  ({recipients.slice(0, 2).join(', ')}
                  {recipients.length > 2 ? ` +${recipients.length - 2}` : ''})
                </span>
              )}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {sentCount} envoyé(s)
              {failedCount > 0 ? ` · ${failedCount} échec(s)` : ''}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {!isConnected && (
            <button
              type="button"
              onClick={handleQuickConnect}
              disabled={connecting}
              className="min-h-9 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors disabled:opacity-60"
            >
              {connecting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Mail className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              <span>{isTokenExpired ? 'Reconnecter Gmail' : 'Connecter Gmail'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={exportEmailAlertHistoryCsv}
            title="Exporter le journal complet des alertes et rapports e-mail au format CSV"
            className="min-h-9 px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-white/[0.12] bg-zinc-50 dark:bg-[#191828] hover:bg-zinc-100 dark:hover:bg-[#222038] text-xs font-semibold text-zinc-800 dark:text-zinc-200 inline-flex items-center gap-1.5 transition-colors"
          >
            <Download
              className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400"
              aria-hidden="true"
            />
            <span>Exporter CSV</span>
          </button>

          <button
            type="button"
            onClick={onOpenEmailModal}
            className="min-h-9 px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#191828] hover:bg-zinc-100 dark:hover:bg-[#222038] text-xs font-semibold text-zinc-800 dark:text-zinc-200 inline-flex items-center gap-1.5 transition-colors"
          >
            <Mail className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            <span>Tester / Envoyer</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('parametres')}
            className="min-h-9 px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#191828] hover:bg-zinc-100 dark:hover:bg-[#222038] text-xs font-semibold text-zinc-800 dark:text-zinc-200 inline-flex items-center gap-1.5 transition-colors"
          >
            <Settings className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" aria-hidden="true" />
            <span>Paramètres Gmail</span>
          </button>
        </div>
      </div>

      {/* Recent Sent Alerts Log */}
      <div className="p-4 sm:p-5">
        {emailAlertHistory.length === 0 ? (
          <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-zinc-400 shrink-0" aria-hidden="true" />
              <span>
                Aucune alerte ni rapport n’a encore été expédié depuis ce poste. Utilisez{' '}
                <strong className="text-zinc-700 dark:text-zinc-300">Tester / Envoyer</strong> ou
                l’onglet <strong className="text-zinc-700 dark:text-zinc-300">Paramètres</strong>{' '}
                pour vérifier votre configuration Gmail avec un rapport factice.
              </span>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-white/[0.08] text-zinc-500 dark:text-zinc-400">
                  <th className="py-2 pr-3 font-semibold">Date &amp; Heure</th>
                  <th className="py-2 px-3 font-semibold">Type</th>
                  <th className="py-2 px-3 font-semibold">Indicateurs / Objet</th>
                  <th className="py-2 px-3 font-semibold">Destinataires</th>
                  <th className="py-2 pl-3 text-right font-semibold">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-white/[0.05]">
                {emailAlertHistory.slice(0, 6).map((entry) => (
                  <tr key={entry.id} className="hover:bg-zinc-50/70 dark:hover:bg-white/[0.02]">
                    <td className="py-2.5 pr-3 font-mono tabular-nums text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                      {new Date(entry.sentAt).toLocaleString('fr-FR', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                      {getDispatchKindLabel(entry.kind)}
                    </td>
                    <td className="py-2.5 px-3 max-w-[320px]">
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {entry.triggeredMetrics.join(' · ') || entry.subject}
                      </div>
                      {entry.error && (
                        <div className="text-[11px] text-rose-700 dark:text-rose-400 truncate mt-0.5 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 shrink-0" aria-hidden="true" />
                          <span>{entry.error}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-zinc-600 dark:text-zinc-400 truncate max-w-[220px]">
                      {entry.recipients.join(', ')}
                    </td>
                    <td className="py-2.5 pl-3 text-right whitespace-nowrap">
                      <span
                        className={`font-mono font-semibold ${
                          entry.status === 'sent'
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-rose-700 dark:text-rose-400'
                        }`}
                      >
                        {entry.status === 'sent' ? 'Envoyé' : 'Échec'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {emailAlertHistory.length > 6 && (
              <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-white/[0.05] flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
                <span>
                  Affichage des 6 derniers envois sur {emailAlertHistory.length} enregistrés.
                </span>
                <button
                  type="button"
                  onClick={exportEmailAlertHistoryCsv}
                  className="font-semibold text-indigo-700 dark:text-indigo-400 hover:underline"
                >
                  Télécharger tout le journal (.csv)
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

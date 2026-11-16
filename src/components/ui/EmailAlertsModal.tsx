import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  Clock,
  Loader2,
  LogOut,
  Mail,
  Send,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { Modal } from './Modal';
import { useFinancial } from '../../context/FinancialContext';
import {
  getCurrentGoogleUser,
  getInMemoryGoogleAccessToken,
  signInWithGoogleForSheets,
  signOutGoogleSheets,
  subscribeGoogleAuthUser,
} from '../../services/googleSheetsAuth';
import {
  buildAlertEmailDraft,
  buildSampleFinancialReportDraft,
  collectWatchedBreaches,
  EMAIL_ALERT_METRICS,
  EmailAlertHistoryEntry,
  EmailAlertMetricId,
  EmailAlertRuleConfig,
  getDispatchKindLabel,
  GmailAuthError,
  parseRecipientEmails,
  PendingEmailAlertDispatch,
  sendKpiAlertEmail,
} from '../../services/gmailAlerts';

interface EmailAlertsModalProps {
  open: boolean;
  onClose: () => void;
  config?: EmailAlertRuleConfig;
  onUpdateConfig?: (next: EmailAlertRuleConfig) => void;
  history?: EmailAlertHistoryEntry[];
  onRecordHistory?: (entry: EmailAlertHistoryEntry) => void;
  onClearHistory?: () => void;
  initialPendingDraft?: PendingEmailAlertDispatch | null;
  onDispatchConfirmed?: (signature: string) => void;
}

export const EmailAlertsModal: React.FC<EmailAlertsModalProps> = ({
  open,
  onClose,
  config: propConfig,
  onUpdateConfig: propOnUpdateConfig,
  history: propHistory,
  onRecordHistory: propOnRecordHistory,
  onClearHistory: propOnClearHistory,
  initialPendingDraft = null,
  onDispatchConfirmed,
}) => {
  const {
    activeProject,
    model,
    kpiAlerts,
    treasurySmartAlert,
    savedScenarios,
    activeScenarioId,
    emailAlertConfig: ctxConfig,
    updateEmailAlertConfig: ctxUpdateConfig,
    emailAlertHistory: ctxHistory,
    recordEmailAlertHistory: ctxRecordHistory,
    clearEmailAlertHistory: ctxClearHistory,
    notify,
  } = useFinancial();

  const config = propConfig ?? ctxConfig;
  const onUpdateConfig = propOnUpdateConfig ?? ctxUpdateConfig;
  const history = propHistory ?? ctxHistory;
  const onRecordHistory = propOnRecordHistory ?? ctxRecordHistory;
  const onClearHistory = propOnClearHistory ?? ctxClearHistory;

  const activeScenarioName =
    savedScenarios.find((s) => s.id === activeScenarioId)?.name || 'Scénario courant';

  const [user, setUser] = useState<User | null>(() => getCurrentGoogleUser());
  const [hasValidToken, setHasValidToken] = useState<boolean>(() =>
    Boolean(getInMemoryGoogleAccessToken())
  );
  const [authLoading, setAuthLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [confirmDraft, setConfirmDraft] = useState<PendingEmailAlertDispatch | null>(null);
  const [sentResult, setSentResult] = useState<{
    messageId: string;
    recipients: string[];
    subject: string;
  } | null>(null);

  useEffect(() => {
    const unsub = subscribeGoogleAuthUser((nextUser) => {
      setUser(nextUser);
      setHasValidToken(Boolean(getInMemoryGoogleAccessToken()));
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (open) {
      setErrorMsg(null);
      setSentResult(null);
      setHasValidToken(Boolean(getInMemoryGoogleAccessToken()));
      setConfirmDraft(initialPendingDraft || null);
    }
  }, [open, initialPendingDraft]);

  const watchedBreaches = collectWatchedBreaches(
    kpiAlerts,
    treasurySmartAlert,
    config.watchedMetrics
  );
  const parsedRecipients = parseRecipientEmails(config.recipients);

  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    setErrorMsg(null);
    try {
      const res = await signInWithGoogleForSheets();
      setUser(res.user);
      setHasValidToken(Boolean(res.accessToken));
      if (!config.recipients.trim() && res.user.email) {
        onUpdateConfig({ ...config, recipients: res.user.email });
      }
      notify('success', `Connecté à Gmail (${res.user.email || 'compte vérifié'}).`);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Impossible de finaliser la connexion Google.'
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleSignOut = async () => {
    await signOutGoogleSheets();
    setHasValidToken(false);
  };

  const toggleWatchedMetric = (id: EmailAlertMetricId) => {
    const exists = config.watchedMetrics.includes(id);
    const next = exists
      ? config.watchedMetrics.filter((m) => m !== id)
      : [...config.watchedMetrics, id];
    onUpdateConfig({ ...config, watchedMetrics: next });
  };

  const handlePrepareConfirmation = () => {
    setErrorMsg(null);
    setSentResult(null);
    if (parsedRecipients.length === 0) {
      setErrorMsg('Saisissez au moins une adresse e-mail destinataire valide.');
      return;
    }
    const draft = buildAlertEmailDraft({
      config,
      breachedDetails: watchedBreaches,
      model,
      projectName: activeProject.name,
      scenarioName: activeScenarioName,
    });
    setConfirmDraft(draft);
  };

  const handlePrepareSampleTest = () => {
    setErrorMsg(null);
    setSentResult(null);
    const targetRecipient = parsedRecipients.length > 0 ? config.recipients : user?.email || '';
    if (parseRecipientEmails(targetRecipient).length === 0) {
      setErrorMsg('Saisissez une adresse e-mail ou connectez votre compte Google pour envoyer le rapport factice de test.');
      return;
    }
    const draft = buildSampleFinancialReportDraft({
      config,
      recipientOverride: targetRecipient,
      projectName: activeProject.name,
    });
    setConfirmDraft(draft);
  };

  const handleConfirmAndSend = async () => {
    if (!confirmDraft) return;
    setErrorMsg(null);

    if (confirmDraft.recipients.length === 0) {
      setErrorMsg('Aucun destinataire valide pour cet envoi.');
      return;
    }

    const token = getInMemoryGoogleAccessToken();
    if (!token) {
      setHasValidToken(false);
      setErrorMsg(
        'Votre jeton Gmail en mémoire a expiré. Reconnectez votre compte Google ci-dessus avant de confirmer l’envoi.'
      );
      return;
    }

    setSendLoading(true);
    try {
      const result = await sendKpiAlertEmail(token, confirmDraft, user?.email);
      const entry: EmailAlertHistoryEntry = {
        id: `mail-${Date.now()}`,
        sentAt: new Date().toISOString(),
        recipients: confirmDraft.recipients,
        subject: confirmDraft.subject,
        triggeredMetrics:
          confirmDraft.kind === 'test'
            ? ['Test · Rapport financier factice']
            : confirmDraft.breachedDetails.length > 0
            ? confirmDraft.breachedDetails.map((b) => b.label)
            : ['Synthèse manuelle'],
        projectName: confirmDraft.projectName,
        scenarioName: confirmDraft.scenarioName,
        status: 'sent',
        kind: confirmDraft.kind || 'alert',
        messageId: result.messageId,
      };
      onRecordHistory(entry);
      onDispatchConfirmed?.(confirmDraft.signature);
      setSentResult({
        messageId: result.messageId,
        recipients: confirmDraft.recipients,
        subject: confirmDraft.subject,
      });
      setConfirmDraft(null);
      notify(
        'success',
        `E-mail (${getDispatchKindLabel(confirmDraft.kind)}) envoyé à ${confirmDraft.recipients.join(', ')}.`
      );
    } catch (err) {
      if (err instanceof GmailAuthError) {
        setHasValidToken(false);
      }
      const message =
        err instanceof Error ? err.message : 'Échec de l’envoi de l’e-mail via Gmail.';
      setErrorMsg(message);
      onRecordHistory({
        id: `mail-err-${Date.now()}`,
        sentAt: new Date().toISOString(),
        recipients: confirmDraft.recipients,
        subject: confirmDraft.subject,
        triggeredMetrics:
          confirmDraft.kind === 'test'
            ? ['Test · Rapport financier factice']
            : confirmDraft.breachedDetails.length > 0
            ? confirmDraft.breachedDetails.map((b) => b.label)
            : ['Synthèse manuelle'],
        projectName: confirmDraft.projectName,
        scenarioName: confirmDraft.scenarioName,
        status: 'failed',
        kind: confirmDraft.kind || 'alert',
        error: message,
      });
    } finally {
      setSendLoading(false);
    }
  };

  const needsAuth = !user || !hasValidToken;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Alertes E-mail Automatiques (Gmail)"
      description="Surveillez les seuils critiques du tableau de bord et préparez un envoi Gmail avec confirmation explicite."
      maxWidthClass="max-w-2xl"
    >
      <div className="space-y-4">
        {/* Error alert */}
        {errorMsg && (
          <div
            role="alert"
            className="p-3 rounded-xl border border-rose-500/40 bg-rose-500/10 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2"
          >
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" aria-hidden="true" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Sent success banner */}
        {sentResult && (
          <div className="p-3.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-xs space-y-1">
            <div className="flex items-center gap-2 font-bold text-emerald-900 dark:text-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
              <span>E-mail d’alerte transmis via Gmail</span>
            </div>
            <p className="text-emerald-800 dark:text-emerald-300">
              Destinataire(s) : <strong>{sentResult.recipients.join(', ')}</strong> · Objet :{' '}
              <span className="font-mono">{sentResult.subject}</span>
            </p>
          </div>
        )}

        {/* Google Sign-In Gate */}
        <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#151424] space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              <Mail className="w-4 h-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
              <span>Compte expéditeur Gmail</span>
            </div>
            {!needsAuth && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-emerald-700 dark:text-emerald-300 font-medium">
                  Connecté : {user?.email || user?.displayName}
                </span>
                <button
                  type="button"
                  onClick={handleGoogleSignOut}
                  className="text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 inline-flex items-center gap-1 font-medium"
                >
                  <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Déconnecter</span>
                </button>
              </div>
            )}
          </div>

          {needsAuth && (
            <div className="space-y-2.5">
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {user && !hasValidToken
                  ? `Reconnectez ${user.email || 'votre compte Google'} pour actualiser l’autorisation d’envoi Gmail en mémoire.`
                  : 'Connectez votre compte Google pour autoriser l’envoi de notifications d’alerte KPI via Gmail (avec confirmation manuelle avant chaque envoi).'}
              </p>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={authLoading}
                className="gsi-material-button w-full sm:w-auto min-h-10 px-4 rounded-lg border border-[#747775] bg-white hover:bg-[#f8f9fa] text-[#1f1f1f] font-medium text-xs inline-flex items-center justify-center gap-2.5 shadow-xs transition-colors disabled:opacity-60"
              >
                {authLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-zinc-700" aria-hidden="true" />
                ) : (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48" aria-hidden="true">
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                  </svg>
                )}
                <span>{authLoading ? 'Connexion en cours…' : 'Se connecter avec Google'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Explicit Email Confirmation Step (Mandatory before sending any email) */}
        {confirmDraft ? (
          <div className="p-4 rounded-xl border border-amber-500/50 bg-amber-500/[0.08] space-y-3">
            <div className="flex items-start gap-2.5">
              <BellRing className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="min-w-0 space-y-1">
                <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white">
                  Confirmation d’envoi requise
                </h3>
                <p className="text-xs text-zinc-700 dark:text-zinc-300">
                  Vérifiez les détails du message ci-dessous avant d’autoriser l’envoi via votre compte Gmail.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg border border-zinc-200 dark:border-white/[0.1] bg-white dark:bg-[#0D0C18] text-xs space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1">
                <span className="text-zinc-500 dark:text-zinc-400 font-medium">Destinataire(s) :</span>
                <span className="sm:col-span-2 font-mono font-semibold text-zinc-900 dark:text-zinc-100 break-all">
                  {confirmDraft.recipients.join(', ')}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1">
                <span className="text-zinc-500 dark:text-zinc-400 font-medium">Objet :</span>
                <span className="sm:col-span-2 font-semibold text-zinc-900 dark:text-zinc-100">
                  {confirmDraft.subject}
                </span>
              </div>
              <div className="pt-2 border-t border-zinc-100 dark:border-white/[0.06]">
                <div className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">
                  Indicateurs inclus ({confirmDraft.breachedDetails.length || 'Test manuel'}) :
                </div>
                {confirmDraft.breachedDetails.length > 0 ? (
                  <ul className="space-y-1 text-[11px]">
                    {confirmDraft.breachedDetails.map((b) => (
                      <li
                        key={b.id}
                        className="flex flex-wrap items-center justify-between gap-2 px-2 py-1 rounded bg-rose-500/10 text-rose-800 dark:text-rose-200"
                      >
                        <span className="font-semibold">{b.label}</span>
                        <span className="font-mono tabular-nums">
                          {b.actualFormatted} (Seuil {b.thresholdFormatted})
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                    Aucun seuil critique n’est actuellement franchi — e-mail de vérification du canal Gmail.
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDraft(null)}
                className="min-h-9 px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-white/[0.14] text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.06]"
              >
                Modifier les réglages
              </button>
              <button
                type="button"
                onClick={handleConfirmAndSend}
                disabled={sendLoading || needsAuth}
                className="min-h-9 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {sendLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                    <span>Envoi Gmail en cours…</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Confirmer et envoyer l’e-mail</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Rule Configuration */}
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-zinc-100 dark:border-white/[0.06]">
                <div>
                  <div className="text-xs font-bold text-zinc-900 dark:text-white">
                    Détection automatique des dépassements de seuil
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Prépare une notification prête à confirmer dès qu’un indicateur critique passe hors cible.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={config.enabled}
                  onClick={() => onUpdateConfig({ ...config, enabled: !config.enabled })}
                  className={`min-h-8 px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                    config.enabled
                      ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'
                      : 'border-zinc-300 dark:border-white/[0.12] bg-zinc-100 dark:bg-[#1A192B] text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  {config.enabled ? 'Surveillance active' : 'Surveillance en pause'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="sm:col-span-2 space-y-1">
                  <label
                    htmlFor="alert-recipients"
                    className="block font-semibold text-zinc-800 dark:text-zinc-200"
                  >
                    Destinataire(s) des alertes
                  </label>
                  <input
                    id="alert-recipients"
                    type="text"
                    value={config.recipients}
                    onChange={(e) => onUpdateConfig({ ...config, recipients: e.target.value })}
                    placeholder="direction@exemple.mg, finance@exemple.mg"
                    className="w-full min-h-9 px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-white/[0.14] bg-zinc-50 dark:bg-[#0D0C18] text-xs font-mono text-zinc-900 dark:text-zinc-100"
                  />
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    Séparez plusieurs adresses par des virgules ({parsedRecipients.length} valide(s)).
                  </span>
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="alert-cooldown"
                    className="block font-semibold text-zinc-800 dark:text-zinc-200"
                  >
                    Délai anti-doublon
                  </label>
                  <select
                    id="alert-cooldown"
                    value={config.cooldownMinutes}
                    onChange={(e) =>
                      onUpdateConfig({ ...config, cooldownMinutes: Number(e.target.value) || 60 })
                    }
                    className="w-full min-h-9 px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-white/[0.14] bg-zinc-50 dark:bg-[#0D0C18] text-xs text-zinc-900 dark:text-zinc-100"
                  >
                    <option value={15}>15 minutes</option>
                    <option value={60}>1 heure</option>
                    <option value={240}>4 heures</option>
                    <option value={1440}>24 heures</option>
                  </select>
                </div>
              </div>

              {/* Watched KPIs */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  Seuils critiques surveillés
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {EMAIL_ALERT_METRICS.map((metric) => {
                    const checked = config.watchedMetrics.includes(metric.id);
                    const currentlyBreached = watchedBreaches.some((b) => b.id === metric.id);
                    return (
                      <button
                        key={metric.id}
                        type="button"
                        onClick={() => toggleWatchedMetric(metric.id)}
                        aria-pressed={checked}
                        className={`p-2.5 rounded-lg border text-left transition-colors ${
                          checked
                            ? 'border-indigo-500/50 bg-indigo-500/10 text-zinc-900 dark:text-white'
                            : 'border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#141322] text-zinc-600 dark:text-zinc-400'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 text-xs font-semibold">
                          <span>{metric.label}</span>
                          <span
                            className={`text-[10px] font-mono ${
                              currentlyBreached
                                ? 'text-rose-600 dark:text-rose-400'
                                : checked
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-zinc-400'
                            }`}
                          >
                            {currentlyBreached ? 'Hors seuil' : checked ? 'Surveillé' : 'Ignoré'}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-snug">
                          {metric.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Current status & manual trigger */}
              <div className="pt-3 border-t border-zinc-100 dark:border-white/[0.06] flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs">
                  {watchedBreaches.length > 0 ? (
                    <>
                      <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" aria-hidden="true" />
                      <span className="font-semibold text-rose-700 dark:text-rose-300">
                        {watchedBreaches.length} alerte(s) prête(s) à notifier
                      </span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
                      <span className="text-zinc-600 dark:text-zinc-400">
                        Tous les seuils surveillés sont conformes
                      </span>
                    </>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrepareSampleTest}
                    className="min-h-9 px-3 py-1.5 rounded-lg border border-amber-500/45 bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 dark:text-amber-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Test : Rapport factice</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePrepareConfirmation}
                    className="min-h-9 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>
                      {watchedBreaches.length > 0
                        ? 'Préparer l’alerte e-mail'
                        : 'Notifier l’état actuel'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* History Log */}
            <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#131220] space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  <Clock className="w-3.5 h-3.5 text-zinc-500" aria-hidden="true" />
                  <span>Historique des envois ({history.length})</span>
                </div>
                {history.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearHistory}
                    className="text-[11px] text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 inline-flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" aria-hidden="true" />
                    <span>Effacer</span>
                  </button>
                )}
              </div>

              {history.length === 0 ? (
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Aucun e-mail envoyé depuis ce poste pour l’instant.
                </p>
              ) : (
                <ul className="divide-y divide-zinc-200 dark:divide-white/[0.06] max-h-40 overflow-y-auto">
                  {history.slice(0, 6).map((item) => (
                    <li
                      key={item.id}
                      className="py-2 first:pt-0 last:pb-0 flex flex-wrap items-center justify-between gap-2 text-[11px]"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                          {item.triggeredMetrics.join(' · ')}
                        </div>
                        <div className="text-zinc-500 dark:text-zinc-400 font-mono truncate">
                          → {item.recipients.join(', ')} ·{' '}
                          {new Date(item.sentAt).toLocaleString('fr-FR', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </div>
                      </div>
                      <span
                        className={`font-mono font-semibold shrink-0 ${
                          item.status === 'sent'
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-rose-700 dark:text-rose-400'
                        }`}
                      >
                        {item.status === 'sent' ? 'Envoyé' : 'Échec'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

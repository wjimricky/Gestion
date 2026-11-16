import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  Download,
  FileText,
  FlaskConical,
  Loader2,
  LogOut,
  Mail,
  Plus,
  Send,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
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
  buildFinancialReportEmailDraft,
  buildSampleFinancialReportDraft,
  collectWatchedBreaches,
  EMAIL_ALERT_METRICS,
  EmailAlertHistoryEntry,
  EmailAlertMetricId,
  getDispatchKindLabel,
  GmailAuthError,
  parseRecipientEmails,
  PendingEmailAlertDispatch,
  sendKpiAlertEmail,
} from '../../services/gmailAlerts';

const EMAIL_INPUT_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const GmailIntegrationSettingsCard: React.FC = () => {
  const {
    activeProject,
    model,
    kpiAlerts,
    treasurySmartAlert,
    savedScenarios,
    activeScenarioId,
    emailAlertConfig,
    updateEmailAlertConfig,
    emailAlertHistory,
    recordEmailAlertHistory,
    clearEmailAlertHistory,
    exportEmailAlertHistoryCsv,
    notify,
  } = useFinancial();

  const activeScenarioName =
    savedScenarios.find((s) => s.id === activeScenarioId)?.name || 'Scénario courant';

  const [user, setUser] = useState<User | null>(() => getCurrentGoogleUser());
  const [hasValidToken, setHasValidToken] = useState<boolean>(() =>
    Boolean(getInMemoryGoogleAccessToken())
  );
  const [authLoading, setAuthLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [recipientInput, setRecipientInput] = useState('');
  const [testTargetEmail, setTestTargetEmail] = useState('');
  const [confirmDraft, setConfirmDraft] = useState<PendingEmailAlertDispatch | null>(null);
  const [lastSentResult, setLastSentResult] = useState<{
    kindLabel: string;
    recipients: string[];
    subject: string;
    messageId: string;
  } | null>(null);

  useEffect(() => {
    const unsub = subscribeGoogleAuthUser((nextUser) => {
      setUser(nextUser);
      setHasValidToken(Boolean(getInMemoryGoogleAccessToken()));
    });
    return unsub;
  }, []);

  const registeredRecipients = parseRecipientEmails(emailAlertConfig.recipients);
  const watchedBreaches = collectWatchedBreaches(
    kpiAlerts,
    treasurySmartAlert,
    emailAlertConfig.watchedMetrics
  );
  const needsAuth = !user || !hasValidToken;

  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    setErrorMsg(null);
    try {
      const res = await signInWithGoogleForSheets();
      setUser(res.user);
      setHasValidToken(Boolean(res.accessToken));
      if (res.user.email && registeredRecipients.length === 0) {
        updateEmailAlertConfig({
          ...emailAlertConfig,
          recipients: res.user.email,
        });
      }
      if (res.user.email && !testTargetEmail.trim()) {
        setTestTargetEmail(res.user.email);
      }
      notify(
        'success',
        `API Gmail autorisée pour ${res.user.email || 'votre compte Google'}.`
      );
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Impossible d’autoriser la connexion Google Gmail.'
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleSignOut = async () => {
    await signOutGoogleSheets();
    setHasValidToken(false);
    notify('info', 'Session Google / Gmail déconnectée.');
  };

  const addRecipient = (rawEmail: string) => {
    const clean = rawEmail.trim();
    if (!clean) return;
    if (!EMAIL_INPUT_REGEX.test(clean)) {
      setErrorMsg(`Adresse e-mail invalide : « ${clean} ».`);
      return;
    }
    setErrorMsg(null);
    if (registeredRecipients.includes(clean)) {
      setRecipientInput('');
      return;
    }
    const nextList = [...registeredRecipients, clean];
    updateEmailAlertConfig({
      ...emailAlertConfig,
      recipients: nextList.join(', '),
    });
    setRecipientInput('');
  };

  const removeRecipient = (emailToRemove: string) => {
    const nextList = registeredRecipients.filter((e) => e !== emailToRemove);
    updateEmailAlertConfig({
      ...emailAlertConfig,
      recipients: nextList.join(', '),
    });
  };

  const toggleWatchedMetric = (id: EmailAlertMetricId) => {
    const exists = emailAlertConfig.watchedMetrics.includes(id);
    const next = exists
      ? emailAlertConfig.watchedMetrics.filter((m) => m !== id)
      : [...emailAlertConfig.watchedMetrics, id];
    updateEmailAlertConfig({
      ...emailAlertConfig,
      watchedMetrics: next,
    });
  };

  const prepareFinancialReportDraft = () => {
    setErrorMsg(null);
    setLastSentResult(null);
    if (registeredRecipients.length === 0) {
      setErrorMsg('Enregistrez au moins une adresse e-mail destinataire ci-dessus.');
      return;
    }
    setConfirmDraft(
      buildFinancialReportEmailDraft({
        config: emailAlertConfig,
        model,
        projectName: activeProject.name,
        scenarioName: activeScenarioName,
        kpiAlerts,
        treasurySmartAlert,
      })
    );
  };

  const prepareAlertDraft = () => {
    setErrorMsg(null);
    setLastSentResult(null);
    if (registeredRecipients.length === 0) {
      setErrorMsg('Enregistrez au moins une adresse e-mail destinataire ci-dessus.');
      return;
    }
    setConfirmDraft(
      buildAlertEmailDraft({
        config: emailAlertConfig,
        breachedDetails: watchedBreaches,
        model,
        projectName: activeProject.name,
        scenarioName: activeScenarioName,
      })
    );
  };

  const prepareSampleTestDraft = () => {
    setErrorMsg(null);
    setLastSentResult(null);
    const fallbackEmail =
      testTargetEmail.trim() ||
      user?.email ||
      registeredRecipients[0] ||
      '';
    if (!EMAIL_INPUT_REGEX.test(fallbackEmail)) {
      setErrorMsg(
        'Saisissez une adresse e-mail valide pour le test ou connectez votre compte Google.'
      );
      return;
    }
    setConfirmDraft(
      buildSampleFinancialReportDraft({
        config: emailAlertConfig,
        recipientOverride: fallbackEmail,
        projectName: activeProject.name,
      })
    );
  };

  const handleConfirmAndSend = async () => {
    if (!confirmDraft) return;
    setErrorMsg(null);
    const token = getInMemoryGoogleAccessToken();
    if (!token) {
      setHasValidToken(false);
      setErrorMsg(
        'Le jeton d’accès Gmail en mémoire a expiré. Cliquez sur « Se connecter avec Google » ci-dessus avant d’envoyer.'
      );
      return;
    }

    setSendLoading(true);
    try {
      const res = await sendKpiAlertEmail(token, confirmDraft, user?.email);
      const entry: EmailAlertHistoryEntry = {
        id: `mail-${Date.now()}`,
        sentAt: new Date().toISOString(),
        recipients: confirmDraft.recipients,
        subject: confirmDraft.subject,
        triggeredMetrics:
          confirmDraft.kind === 'test'
            ? ['Test · Rapport financier factice']
            : confirmDraft.kind === 'report'
            ? [
                'Rapport financier complet',
                ...(confirmDraft.breachedDetails.length > 0
                  ? confirmDraft.breachedDetails.map((b) => b.label)
                  : []),
              ]
            : confirmDraft.breachedDetails.length > 0
            ? confirmDraft.breachedDetails.map((b) => b.label)
            : ['Vérification manuelle'],
        projectName: confirmDraft.projectName,
        scenarioName: confirmDraft.scenarioName,
        status: 'sent',
        kind: confirmDraft.kind || 'alert',
        messageId: res.messageId,
      };
      recordEmailAlertHistory(entry);
      setLastSentResult({
        kindLabel: getDispatchKindLabel(confirmDraft.kind),
        recipients: confirmDraft.recipients,
        subject: confirmDraft.subject,
        messageId: res.messageId,
      });
      setConfirmDraft(null);
      notify(
        'success',
        `${getDispatchKindLabel(confirmDraft.kind)} envoyé via Gmail à ${confirmDraft.recipients.join(', ')}.`
      );
    } catch (err) {
      if (err instanceof GmailAuthError) {
        setHasValidToken(false);
      }
      const message =
        err instanceof Error ? err.message : 'Erreur lors de l’envoi via API Gmail.';
      setErrorMsg(message);
      recordEmailAlertHistory({
        id: `mail-err-${Date.now()}`,
        sentAt: new Date().toISOString(),
        recipients: confirmDraft.recipients,
        subject: confirmDraft.subject,
        triggeredMetrics:
          confirmDraft.kind === 'test'
            ? ['Test · Rapport financier factice']
            : confirmDraft.breachedDetails.map((b) => b.label),
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

  return (
    <section
      aria-label="Configuration de l'intégration API Gmail"
      className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] overflow-hidden"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-zinc-200 dark:border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Mail className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" aria-hidden="true" />
            <span>Intégration API Gmail — Rapports &amp; Alertes Seuils Critiques</span>
          </h2>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
            Configurez le compte expéditeur Gmail, les adresses enregistrées et testez la distribution avec un rapport financier factice.
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={emailAlertConfig.enabled}
          onClick={() =>
            updateEmailAlertConfig({
              ...emailAlertConfig,
              enabled: !emailAlertConfig.enabled,
            })
          }
          className={`min-h-9 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors self-start sm:self-auto ${
            emailAlertConfig.enabled
              ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'
              : 'border-zinc-300 dark:border-white/[0.12] bg-zinc-50 dark:bg-[#191828] text-zinc-600 dark:text-zinc-400'
          }`}
        >
          {emailAlertConfig.enabled ? 'Alertes auto : Actives' : 'Alertes auto : En pause'}
        </button>
      </div>

      <div className="p-5 space-y-5">
        {errorMsg && (
          <div
            role="alert"
            className="p-3.5 rounded-xl border border-rose-500/45 bg-rose-500/10 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2"
          >
            <AlertTriangle
              className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <span>{errorMsg}</span>
          </div>
        )}

        {lastSentResult && (
          <div className="p-3.5 rounded-xl border border-emerald-500/45 bg-emerald-500/10 text-xs space-y-1">
            <div className="flex items-center gap-2 font-bold text-emerald-900 dark:text-emerald-200">
              <CheckCircle2
                className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0"
                aria-hidden="true"
              />
              <span>{lastSentResult.kindLabel} transmis via Gmail</span>
            </div>
            <p className="text-emerald-800 dark:text-emerald-300">
              Destinataire(s) : <strong>{lastSentResult.recipients.join(', ')}</strong> · Objet :{' '}
              <span className="font-mono">{lastSentResult.subject}</span>
            </p>
          </div>
        )}

        {/* Step 1: Google OAuth & Account Status */}
        <div className="p-4 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#151424] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
              1. Authentification OAuth Gmail (Scope gmail.send)
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              {!needsAuth
                ? `Connecté en tant que ${user?.email || user?.displayName}. Le jeton reste strictement en mémoire pour cette session.`
                : user && !hasValidToken
                ? `Session Firebase détectée (${user.email}), mais le jeton OAuth Gmail en mémoire a expiré. Reconnectez-vous pour autoriser l’envoi.`
                : 'Connectez votre compte Google pour activer l’envoi direct des rapports et alertes depuis RizMadagascar.'}
            </p>
          </div>

          <div className="shrink-0">
            {!needsAuth ? (
              <button
                type="button"
                onClick={handleGoogleSignOut}
                className="min-h-9 px-3.5 py-1.5 rounded-lg border border-zinc-300 dark:border-white/[0.14] bg-white dark:bg-[#191828] hover:border-rose-500/50 hover:text-rose-600 dark:hover:text-rose-400 text-xs font-semibold text-zinc-700 dark:text-zinc-200 inline-flex items-center gap-1.5 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Déconnecter Gmail</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={authLoading}
                className="gsi-material-button min-h-10 px-4 rounded-lg border border-[#747775] bg-white hover:bg-[#f8f9fa] text-[#1f1f1f] font-medium text-xs inline-flex items-center justify-center gap-2.5 shadow-xs transition-colors disabled:opacity-60"
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
                <span>{authLoading ? 'Connexion…' : 'Se connecter avec Google'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Step 2: Registered Recipients + Trigger Rules */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-6 p-4 rounded-xl border border-zinc-200 dark:border-white/[0.08] space-y-3">
            <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
              2. Adresses e-mail enregistrées ({registeredRecipients.length})
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                addRecipient(recipientInput);
              }}
              className="flex gap-2"
            >
              <input
                type="email"
                value={recipientInput}
                onChange={(e) => setRecipientInput(e.target.value)}
                placeholder="Ajouter un destinataire (ex: finance@riziere.mg)"
                aria-label="Nouvelle adresse e-mail destinataire"
                className="flex-1 min-h-9 px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-white/[0.14] bg-zinc-50 dark:bg-[#0D0C18] text-xs font-mono text-zinc-900 dark:text-zinc-100"
              />
              <button
                type="submit"
                className="min-h-9 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-[#23213D] dark:hover:bg-[#2E2B52] text-white text-xs font-semibold inline-flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Ajouter</span>
              </button>
            </form>

            {user?.email && !registeredRecipients.includes(user.email) && (
              <button
                type="button"
                onClick={() => addRecipient(user.email || '')}
                className="text-[11px] font-medium text-indigo-700 dark:text-indigo-400 hover:underline"
              >
                + Ajouter mon adresse Google ({user.email})
              </button>
            )}

            <div className="flex flex-wrap gap-1.5 pt-1">
              {registeredRecipients.length === 0 ? (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Aucune adresse enregistrée pour l’instant.
                </p>
              ) : (
                registeredRecipients.map((email) => (
                  <span
                    key={email}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-white/[0.1] bg-zinc-50 dark:bg-[#171628] text-xs font-mono text-zinc-800 dark:text-zinc-200"
                  >
                    <span>{email}</span>
                    <button
                      type="button"
                      onClick={() => removeRecipient(email)}
                      aria-label={`Supprimer ${email}`}
                      className="text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400"
                    >
                      <X className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </span>
                ))
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-zinc-100 dark:border-white/[0.06] text-xs">
              <label className="space-y-1">
                <span className="block font-semibold text-zinc-700 dark:text-zinc-300">
                  Préfixe d’objet
                </span>
                <input
                  type="text"
                  value={emailAlertConfig.subjectPrefix}
                  onChange={(e) =>
                    updateEmailAlertConfig({
                      ...emailAlertConfig,
                      subjectPrefix: e.target.value,
                    })
                  }
                  className="w-full min-h-9 px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-white/[0.14] bg-zinc-50 dark:bg-[#0D0C18] text-xs text-zinc-900 dark:text-zinc-100"
                />
              </label>

              <label className="space-y-1">
                <span className="block font-semibold text-zinc-700 dark:text-zinc-300">
                  Délai anti-doublon
                </span>
                <select
                  value={emailAlertConfig.cooldownMinutes}
                  onChange={(e) =>
                    updateEmailAlertConfig({
                      ...emailAlertConfig,
                      cooldownMinutes: Number(e.target.value) || 60,
                    })
                  }
                  className="w-full min-h-9 px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-white/[0.14] bg-zinc-50 dark:bg-[#0D0C18] text-xs text-zinc-900 dark:text-zinc-100"
                >
                  <option value={15}>15 minutes</option>
                  <option value={60}>1 heure</option>
                  <option value={240}>4 heures</option>
                  <option value={1440}>24 heures</option>
                </select>
              </label>
            </div>
          </div>

          {/* Watched Thresholds */}
          <div className="lg:col-span-6 p-4 rounded-xl border border-zinc-200 dark:border-white/[0.08] space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                3. Seuils critiques déclencheurs d’alerte
              </div>
              <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                {watchedBreaches.length > 0 ? (
                  <span className="text-rose-600 dark:text-rose-400 font-semibold">
                    {watchedBreaches.length} hors seuil
                  </span>
                ) : (
                  <span className="text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                    Conformes
                  </span>
                )}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {EMAIL_ALERT_METRICS.map((metric) => {
                const checked = emailAlertConfig.watchedMetrics.includes(metric.id);
                const breached = watchedBreaches.some((b) => b.id === metric.id);
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
                      <span className="truncate">{metric.label}</span>
                      <span
                        className={`text-[10px] font-mono shrink-0 ${
                          breached
                            ? 'text-rose-600 dark:text-rose-400'
                            : checked
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-zinc-400'
                        }`}
                      >
                        {breached ? 'Alerte' : checked ? 'Actif' : 'Inactif'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Step 3: Confirmation Preview OR Dispatch Center + Dummy Report Test */}
        {confirmDraft ? (
          <div className="p-4 rounded-xl border border-amber-500/50 bg-amber-500/[0.08] space-y-3">
            <div className="flex items-start gap-2.5">
              <BellRing
                className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white">
                  Confirmation d’envoi Gmail — {getDispatchKindLabel(confirmDraft.kind)}
                </h3>
                <p className="text-xs text-zinc-700 dark:text-zinc-300 mt-0.5">
                  Vérifiez les destinataires, l’objet et le contenu résumé ci-dessous avant d’expédier ce message via votre compte Gmail.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg border border-zinc-200 dark:border-white/[0.1] bg-white dark:bg-[#0D0C18] text-xs space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-1">
                <span className="text-zinc-500 dark:text-zinc-400 font-medium">Destinataire(s) :</span>
                <span className="sm:col-span-3 font-mono font-semibold text-zinc-900 dark:text-zinc-100 break-all">
                  {confirmDraft.recipients.join(', ')}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-1">
                <span className="text-zinc-500 dark:text-zinc-400 font-medium">Objet :</span>
                <span className="sm:col-span-3 font-semibold text-zinc-900 dark:text-zinc-100">
                  {confirmDraft.subject}
                </span>
              </div>
              <pre className="mt-2 p-2.5 rounded-lg bg-zinc-50 dark:bg-[#141322] border border-zinc-200 dark:border-white/[0.06] text-[11px] font-mono text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap max-h-44 overflow-y-auto">
                {confirmDraft.textBody}
              </pre>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDraft(null)}
                className="min-h-9 px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-white/[0.14] text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.06]"
              >
                Annuler
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
                    <span>Envoi via Gmail…</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Confirmer et envoyer via Gmail</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Direct Report & Alert Dispatch */}
            <div className="lg:col-span-7 p-4 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/50 dark:bg-[#151424]/70 flex flex-col justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  4. Envoi direct des rapports &amp; alertes du modèle actif
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                  Expédiez la synthèse financière complète ou les alertes de seuils critiques vers les {registeredRecipients.length} adresse(s) enregistrée(s).
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={prepareFinancialReportDraft}
                  className="min-h-9 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Envoyer le rapport financier</span>
                </button>
                <button
                  type="button"
                  onClick={prepareAlertDraft}
                  className="min-h-9 px-3.5 py-1.5 rounded-lg border border-zinc-300 dark:border-white/[0.14] bg-white dark:bg-[#191828] hover:bg-zinc-100 dark:hover:bg-[#222038] text-zinc-800 dark:text-zinc-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                >
                  <BellRing className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                  <span>
                    Notifier les seuils ({watchedBreaches.length})
                  </span>
                </button>
              </div>
            </div>

            {/* Dummy Test Report Option */}
            <div className="lg:col-span-5 p-4 rounded-xl border border-amber-500/35 bg-amber-500/[0.06] space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-200">
                <FlaskConical className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Option Test : Rapport financier factice</span>
              </div>
              <p className="text-[11px] text-zinc-700 dark:text-zinc-300 leading-snug">
                Envoie un rapport factice clairement identifié [TEST] pour valider votre configuration Gmail sans exposer vos données réelles.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  value={testTargetEmail}
                  onChange={(e) => setTestTargetEmail(e.target.value)}
                  placeholder={user?.email || registeredRecipients[0] || 'votre@email.com'}
                  aria-label="Adresse e-mail pour recevoir le rapport financier factice de test"
                  className="flex-1 min-h-9 px-2.5 py-1.5 rounded-lg border border-amber-500/40 bg-white dark:bg-[#0D0C18] text-xs font-mono text-zinc-900 dark:text-zinc-100"
                />
                <button
                  type="button"
                  onClick={prepareSampleTestDraft}
                  className="min-h-9 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors"
                >
                  <Send className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Envoyer un test factice</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* History Summary Footer */}
        <div className="pt-3 border-t border-zinc-100 dark:border-white/[0.06] flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-zinc-600 dark:text-zinc-400">
            Historique local des e-mails :{' '}
            <strong className="font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
              {emailAlertHistory.length}
            </strong>{' '}
            envoi(s) enregistré(s)
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportEmailAlertHistoryCsv}
              className="min-h-8 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-white/[0.1] hover:bg-zinc-100 dark:hover:bg-white/[0.05] text-xs font-semibold text-zinc-700 dark:text-zinc-300 inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" aria-hidden="true" />
              <span>Exporter CSV</span>
            </button>
            {emailAlertHistory.length > 0 && (
              <button
                type="button"
                onClick={clearEmailAlertHistory}
                className="min-h-8 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-white/[0.1] hover:border-rose-500/40 hover:text-rose-600 dark:hover:text-rose-400 text-xs font-semibold text-zinc-600 dark:text-zinc-400 inline-flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Effacer</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
